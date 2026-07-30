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
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { createPreference, fetchPayment } from "./mercadopago";

initializeApp();
const db = getFirestore();
const auth = getAuth();

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
  zoneId?: string;
  notes?: string;
  paymentMethod?: string;
  /** Origen del storefront (para back_urls / checkout simulado). */
  baseUrl?: string;
}

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
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

  const paymentMethod = data.paymentMethod === "mercadopago" ? "mercadopago" : "cash";
  if (data.paymentMethod !== "cash" && data.paymentMethod !== "mercadopago") {
    throw new HttpsError("invalid-argument", "Medio de pago inválido.");
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
  if (paymentMethod === "mercadopago" && tenant.config?.mpEnabled !== true) {
    throw new HttpsError(
      "failed-precondition",
      "El pago online no está disponible en este comercio.",
    );
  }

  // Anti-fraude capa 5: teléfonos bloqueados por el comercio.
  const phoneKey = phone.replace(/\D/g, ""); // solo dígitos como clave
  const blocked = await db.doc(`tenants/${tenantId}/blocklist/${phoneKey}`).get();
  if (blocked.exists) {
    // Mensaje genérico a propósito: no le confirmamos al abusador que
    // está en la lista.
    throw new HttpsError(
      "failed-precondition",
      "No pudimos tomar tu pedido. Comunicate con el local.",
    );
  }

  // Zona de reparto: si el comercio configuró zonas, el delivery exige una
  // y el costo de envío sale de la config del servidor, no del cliente.
  let deliveryFee = 0;
  let zoneName: string | undefined;
  const zones = (tenant.config?.deliveryZones ?? []) as DeliveryZone[];
  if (channel === "delivery" && zones.length > 0) {
    const zone = zones.find((z) => z.id === data.zoneId);
    if (!zone) {
      throw new HttpsError("invalid-argument", "Elegí tu zona de entrega.");
    }
    deliveryFee = typeof zone.fee === "number" && zone.fee >= 0 ? zone.fee : 0;
    zoneName = zone.name;
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

  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (itemsTotal <= 0) {
    throw new HttpsError("invalid-argument", "El pedido está vacío.");
  }
  const total = itemsTotal + deliveryFee;

  // ── Creación atómica: rate limit + número secuencial + pedido ─────────
  const counterRef = db.doc(`tenants/${tenantId}/counters/orders`);
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
    // MercadoPago: el pedido nace "pendiente_pago" (invisible en cola/cocina/
    // stats) hasta que el webhook confirma la acreditación. Efectivo entra
    // directo a "por confirmar".
    const status = paymentMethod === "mercadopago" ? "pendiente_pago" : "por_confirmar";
    tx.set(orderRef, {
      number: next,
      items,
      total,
      ...(zoneName ? { deliveryFee, zoneName } : {}),
      customer: { name, phone },
      channel,
      ...(channel === "delivery" ? { address } : {}),
      ...(data.notes?.trim() ? { notes: data.notes.trim().slice(0, 200) } : {}),
      paymentMethod,
      paymentStatus: "pending",
      status,
      createdAt: now,
      updatedAt: now,
    });
    return next;
  });

  // Efectivo: listo. MercadoPago: crear la preferencia y devolver el checkout.
  if (paymentMethod === "cash") {
    return { orderId: orderRef.id, number, total, status: "por_confirmar" };
  }

  const baseUrl =
    typeof data.baseUrl === "string" && /^https?:\/\//.test(data.baseUrl)
      ? data.baseUrl.replace(/\/$/, "").slice(0, 200)
      : "";
  try {
    const mpCreds = (await db.doc(`tenants/${tenantId}/private/mp`).get()).data() as
      | { accessToken?: string }
      | undefined;
    const pref = await createPreference(
      {
        tenantId,
        orderId: orderRef.id,
        storeName: (tenant.branding?.name as string) ?? tenantId,
        items: items.map((it) => ({
          title: it.name,
          quantity: it.qty,
          unit_price: it.price,
        })),
        baseUrl,
      },
      mpCreds,
    );
    return {
      orderId: orderRef.id,
      number,
      total,
      status: "pendiente_pago",
      checkoutUrl: pref.checkoutUrl,
      simulated: pref.simulated,
    };
  } catch {
    // Si no se pudo crear el cobro, el pedido no debe quedar colgado.
    await orderRef.delete().catch(() => {});
    throw new HttpsError("internal", "No pudimos iniciar el cobro. Probá de nuevo.");
  }
});

/**
 * Aplica el resultado de un pago al pedido, de forma IDEMPOTENTE.
 * La clave es el doc payments/{paymentId}: si ya existe, no hace nada
 * (un webhook repetido de MercadoPago no cobra ni confirma dos veces).
 */
async function applyPayment(
  tenantId: string,
  orderId: string,
  paymentId: string,
  approved: boolean,
  amount: number,
  provider: "mercadopago" | "simulado",
): Promise<void> {
  const paymentRef = db.doc(`tenants/${tenantId}/payments/${paymentId}`);
  const orderRef = db.doc(`tenants/${tenantId}/orders/${orderId}`);

  await db.runTransaction(async (tx) => {
    const [paymentSnap, orderSnap] = await Promise.all([tx.get(paymentRef), tx.get(orderRef)]);
    if (paymentSnap.exists) return; // ya procesado

    const now = Date.now();
    tx.set(paymentRef, {
      orderId,
      provider,
      status: approved ? "approved" : "rejected",
      amount,
      createdAt: now,
    });

    if (!orderSnap.exists) return; // pago sin pedido: solo se audita
    const order = orderSnap.data()!;

    if (approved) {
      tx.update(orderRef, {
        paymentStatus: "paid",
        // Recién ahora el pedido se vuelve visible para el comercio.
        ...(order.status === "pendiente_pago" ? { status: "por_confirmar" } : {}),
        updatedAt: now,
      });
    } else if (order.status === "pendiente_pago") {
      tx.update(orderRef, { status: "rechazado", updatedAt: now });
    }
  });
}

/**
 * Webhook de MercadoPago (idempotente). Se ejercita cuando hay credenciales:
 * MP notifica un pago, consultamos su estado y confirmamos el pedido.
 * La notification_url se configura por comercio con ?tenant=<id>.
 */
export const mpWebhook = onRequest(async (req, res) => {
  const paymentId = String(
    req.query["data.id"] ?? (req.body as { data?: { id?: string } })?.data?.id ?? req.query.id ?? "",
  );
  const tenantId = String(req.query.tenant ?? "");
  if (!paymentId || !tenantId) {
    res.status(200).send("ignored");
    return;
  }
  const mpCreds = (await db.doc(`tenants/${tenantId}/private/mp`).get()).data() as
    | { accessToken?: string }
    | undefined;
  const payment = await fetchPayment(paymentId, mpCreds);
  if (!payment) {
    res.status(200).send("no-data");
    return;
  }
  const orderId = payment.externalReference.split(":")[1] ?? "";
  if (orderId) {
    await applyPayment(
      tenantId,
      orderId,
      `mp-${paymentId}`,
      payment.status === "approved",
      payment.amount,
      "mercadopago",
    );
  }
  res.status(200).send("ok");
});

/**
 * Pago SIMULADO — solo en el emulador. Cierra el loop de cobro sin MP real:
 * la página /pago-simulado lo llama para aprobar o rechazar el pedido.
 * Usa el MISMO applyPayment que el webhook, así la lógica de acreditación
 * (idempotencia, transición de estados) queda probada de verdad.
 */
export const simulatePayment = onCall(async (request) => {
  if (process.env.FUNCTIONS_EMULATOR !== "true") {
    throw new HttpsError("permission-denied", "Solo disponible en desarrollo.");
  }
  const data = (request.data ?? {}) as { tenantId?: string; orderId?: string; approve?: boolean };
  const tenantId = data.tenantId ?? "";
  const orderId = data.orderId ?? "";
  if (!TENANT_ID_RE.test(tenantId) || !orderId) {
    throw new HttpsError("invalid-argument", "Datos inválidos.");
  }
  const orderSnap = await db.doc(`tenants/${tenantId}/orders/${orderId}`).get();
  const order = orderSnap.data();
  if (!order) throw new HttpsError("not-found", "El pedido no existe.");

  await applyPayment(
    tenantId,
    orderId,
    `sim-${orderId}`,
    data.approve !== false,
    (order.total as number) ?? 0,
    "simulado",
  );
  return { ok: true, approved: data.approve !== false };
});

const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "panel"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLANS = new Set(["presencia", "gestion", "pro"]);

interface ProvisionInput {
  subdomain?: string;
  businessName?: string;
  email?: string;
  password?: string;
  plan?: string;
}

/**
 * Alta self-service: crea el tenant y su usuario dueño en un solo paso.
 *
 * Idempotencia: el doc del tenant se crea con `.create()` (falla si el
 * subdominio ya existe) y el email no puede estar repetido — reintentar
 * el mismo alta nunca genera dos tenants. El cobro del primer mes
 * (MercadoPago) se enchufa acá cuando estén las credenciales: hasta
 * entonces el tenant nace en estado "trial".
 */
export const provisionTenant = onCall(async (request) => {
  const data = (request.data ?? {}) as ProvisionInput;

  const subdomain = data.subdomain?.trim().toLowerCase() ?? "";
  if (!TENANT_ID_RE.test(subdomain) || RESERVED_SUBDOMAINS.has(subdomain)) {
    throw new HttpsError(
      "invalid-argument",
      "El subdominio solo puede tener minúsculas, números y guiones.",
    );
  }

  const businessName = data.businessName?.trim() ?? "";
  if (businessName.length < 2 || businessName.length > 60) {
    throw new HttpsError("invalid-argument", "Decinos el nombre de tu comercio.");
  }

  const email = data.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "El email no parece válido.");
  }

  const password = data.password ?? "";
  if (password.length < 8) {
    throw new HttpsError(
      "invalid-argument",
      "La contraseña necesita al menos 8 caracteres.",
    );
  }

  const plan = data.plan ?? "gestion";
  if (!PLANS.has(plan)) {
    throw new HttpsError("invalid-argument", "Plan inválido.");
  }

  // El email no puede estar en uso (un dueño = una cuenta).
  try {
    await auth.getUserByEmail(email);
    throw new HttpsError(
      "already-exists",
      "Ya existe una cuenta con ese email. Ingresá desde el panel de tu tienda.",
    );
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    // user-not-found: es lo que queremos.
  }

  // Reserva atómica del subdominio: create() falla si ya existe.
  const tenantRef = db.doc(`tenants/${subdomain}`);
  try {
    await tenantRef.create({
      subdomain,
      plan,
      status: "trial",
      branding: {
        name: businessName,
        colors: { primary: "#f97316", accent: "#0ea5e9", mode: "light" },
        font: "sans",
      },
      config: { acceptingOrders: true },
      createdAt: Date.now(),
    });
  } catch {
    throw new HttpsError("already-exists", "Ese subdominio ya está tomado. Probá otro.");
  }

  // Usuario dueño atado a su tenant vía custom claims.
  try {
    const user = await auth.createUser({ email, password, emailVerified: false });
    await auth.setCustomUserClaims(user.uid, { tenantId: subdomain, role: "owner" });
    await db.doc(`tenants/${subdomain}/members/${user.uid}`).set({
      email,
      role: "owner",
      createdAt: Date.now(),
    });
  } catch {
    // Si el usuario no pudo crearse, no dejamos un tenant huérfano.
    await tenantRef.delete().catch(() => {});
    throw new HttpsError("internal", "No pudimos crear tu cuenta. Probá de nuevo.");
  }

  return { tenantId: subdomain };
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
