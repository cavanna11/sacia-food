/**
 * Cloud Functions — lógica sensible del sistema.
 *
 * El frontend pide, el backend decide: acá se re-valida TODO (tenant,
 * productos, precios) sin confiar en nada que venga del navegador.
 *
 * Roadmap:
 *  - createOrder      ✅ crea el pedido con precios del servidor.
 *  - confirmPayment   (entrega 3): webhook de MercadoPago, idempotente.
 *  - provisionTenant  (Fase 2): alta self-service, clona plantilla.
 *  - changePlan       (Fase 2): upgrade/downgrade de suscripción.
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

/** Claims tipados que estampa el sistema al crear usuarios de un tenant. */
interface TenantClaims {
  tenantId?: string;
  role?: string;
}

const TENANT_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const PHONE_RE = /^[\d+\-\s()]{6,20}$/;
const MAX_ITEMS = 30;
const MAX_QTY = 20;

// Anti-fraude capa 1 (parcial): límite de pedidos por teléfono.
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_MAX_ORDERS = 3;

/**
 * ¿La tienda acepta pedidos ahora? Réplica server-side de
 * src/lib/opening-hours.ts (paquetes separados a propósito: el frontend
 * solo muestra, el backend decide).
 */
function isOpenNow(config?: {
  acceptingOrders?: boolean;
  hours?: { open: string; close: string };
  timezone?: string;
}): boolean {
  if (config?.acceptingOrders === false) return false;
  const hours = config?.hours;
  if (!hours) return true;

  const toMinutes = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h > 23 || min > 59 ? null : h * 60 + min;
  };
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  if (open === null || close === null || open === close) return true;

  const current = toMinutes(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: config?.timezone ?? "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
  ) ?? 0;

  return open < close
    ? current >= open && current < close
    : current >= open || current < close; // ventana que cruza medianoche
}

interface CreateOrderInput {
  tenantId?: string;
  items?: { productId?: string; qty?: number }[];
  customer?: { name?: string; phone?: string };
  channel?: string;
  address?: string;
  notes?: string;
  paymentMethod?: string;
}

/**
 * Crea un pedido. Invocable anónimamente (el cliente final no tiene cuenta),
 * pero nada del payload se toma como cierto: los precios y nombres salen de
 * la base, el total se calcula acá, y el pedido nace "por confirmar"
 * (anti-fraude capa 3: no dispara a cocina hasta que el comercio acepta).
 */
export const createOrder = onCall(async (request) => {
  const data = (request.data ?? {}) as CreateOrderInput;

  // ── Validación de forma ────────────────────────────────────────────────
  const tenantId = data.tenantId;
  if (!tenantId || !TENANT_ID_RE.test(tenantId)) {
    throw new HttpsError("invalid-argument", "Comercio inválido.");
  }

  const name = data.customer?.name?.trim() ?? "";
  const phone = data.customer?.phone?.trim() ?? "";
  if (name.length < 2 || name.length > 60) {
    throw new HttpsError("invalid-argument", "Decinos tu nombre.");
  }
  if (!PHONE_RE.test(phone)) {
    throw new HttpsError("invalid-argument", "El teléfono no parece válido.");
  }

  const channel = data.channel;
  if (channel !== "takeaway" && channel !== "delivery") {
    throw new HttpsError("invalid-argument", "Elegí retiro o envío.");
  }
  const address = data.address?.trim() ?? "";
  if (channel === "delivery" && (address.length < 5 || address.length > 120)) {
    throw new HttpsError("invalid-argument", "Necesitamos una dirección de entrega.");
  }

  if (data.paymentMethod !== "cash") {
    throw new HttpsError("invalid-argument", "Medio de pago no disponible todavía.");
  }

  const rawItems = data.items ?? [];
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > MAX_ITEMS) {
    throw new HttpsError("invalid-argument", "El pedido está vacío.");
  }
  for (const item of rawItems) {
    if (
      typeof item?.productId !== "string" ||
      !Number.isInteger(item?.qty) ||
      (item.qty as number) < 1 ||
      (item.qty as number) > MAX_QTY
    ) {
      throw new HttpsError("invalid-argument", "Hay un producto inválido en el pedido.");
    }
  }

  // ── Validación contra la base (nunca confiar en el cliente) ───────────
  const tenantSnap = await db.doc(`tenants/${tenantId}`).get();
  const tenant = tenantSnap.data();
  if (!tenant || tenant.status !== "active") {
    throw new HttpsError("not-found", "El comercio no está disponible.");
  }
  if (!isOpenNow(tenant.config)) {
    throw new HttpsError(
      "failed-precondition",
      "La tienda está cerrada en este momento.",
    );
  }

  // Consolidar cantidades por producto (por si mandan repetidos).
  const qtyByProduct = new Map<string, number>();
  for (const item of rawItems) {
    const id = item.productId as string;
    qtyByProduct.set(id, (qtyByProduct.get(id) ?? 0) + (item.qty as number));
  }

  const productRefs = [...qtyByProduct.keys()].map((id) =>
    db.doc(`tenants/${tenantId}/products/${id}`),
  );
  const productSnaps = await db.getAll(...productRefs);

  const items = productSnaps.map((snap) => {
    const product = snap.data();
    if (!product || product.available !== true) {
      throw new HttpsError(
        "failed-precondition",
        "Un producto del pedido ya no está disponible. Actualizá el menú.",
      );
    }
    const qty = qtyByProduct.get(snap.id)!;
    return {
      productId: snap.id,
      name: product.name as string,
      price: product.price as number, // precio del servidor, no del cliente
      qty,
      subtotal: (product.price as number) * qty,
    };
  });

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (total <= 0) {
    throw new HttpsError("invalid-argument", "El pedido está vacío.");
  }

  // ── Creación atómica: rate limit + número secuencial + pedido ─────────
  const counterRef = db.doc(`tenants/${tenantId}/counters/orders`);
  const phoneKey = phone.replace(/\D/g, ""); // solo dígitos como clave
  const rateRef = db.doc(`tenants/${tenantId}/ratelimits/${phoneKey}`);
  const orderRef = db.collection(`tenants/${tenantId}/orders`).doc();

  const number = await db.runTransaction(async (tx) => {
    const [counter, rate] = await Promise.all([tx.get(counterRef), tx.get(rateRef)]);

    // Anti-fraude capa 1 (parcial): máx N pedidos por teléfono por ventana.
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recent = ((rate.data()?.timestamps as number[]) ?? []).filter((t) => t > cutoff);
    if (recent.length >= RATE_LIMIT_MAX_ORDERS) {
      throw new HttpsError(
        "resource-exhausted",
        "Hiciste varios pedidos seguidos. Esperá unos minutos e intentá de nuevo.",
      );
    }
    tx.set(rateRef, { timestamps: [...recent, Date.now()] });

    const next = ((counter.data()?.value as number) ?? 0) + 1;
    tx.set(counterRef, { value: next }, { merge: true });

    const now = Date.now();
    tx.set(orderRef, {
      number: next,
      items,
      total,
      customer: { name, phone },
      channel,
      ...(channel === "delivery" ? { address } : {}),
      ...(data.notes?.trim() ? { notes: data.notes.trim().slice(0, 200) } : {}),
      paymentMethod: "cash",
      paymentStatus: "pending",
      status: "por_confirmar",
      createdAt: now,
      updatedAt: now,
    });
    return next;
  });

  return { orderId: orderRef.id, number, total, status: "por_confirmar" };
});

/**
 * Espejo público del pedido para el tracking del cliente final.
 * Cada cambio en tenants/{t}/orders/{id} se replica a
 * tenants/{t}/tracking/{id} SIN datos personales (ni nombre, ni teléfono,
 * ni dirección). El cliente lo sigue desde /pedido/{id}: el ID del
 * documento es inadivinable y funciona como token de acceso.
 */
export const syncTracking = onDocumentWritten(
  "tenants/{tenantId}/orders/{orderId}",
  async (event) => {
    const { tenantId, orderId } = event.params;
    const trackingRef = db.doc(`tenants/${tenantId}/tracking/${orderId}`);

    const after = event.data?.after;
    if (!after?.exists) {
      await trackingRef.delete();
      return;
    }
    const order = after.data()!;
    await trackingRef.set({
      number: order.number,
      status: order.status,
      channel: order.channel,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  },
);

/**
 * Ping de salud con validación de tenant: prueba del patrón
 * "callable + verificación de claims" de punta a punta.
 */
export const ping = onCall(async (request) => {
  const claims = (request.auth?.token ?? {}) as TenantClaims;
  const tenantId = request.data?.tenantId as string | undefined;

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Necesitás iniciar sesión.");
  }
  if (!tenantId || claims.tenantId !== tenantId) {
    throw new HttpsError("permission-denied", "No pertenecés a este comercio.");
  }

  const tenant = await db.doc(`tenants/${tenantId}`).get();
  if (!tenant.exists) {
    throw new HttpsError("not-found", "El comercio no existe.");
  }

  return { ok: true, tenantId, at: Date.now() };
});
