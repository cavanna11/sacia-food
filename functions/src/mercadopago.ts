/**
 * Integración con MercadoPago — con seam de credenciales.
 *
 * En este SaaS cada comercio cobra en SU cuenta MP: el access token es
 * por-tenant (se guarda tokenizado en tenants/{id}/private/mp tras el OAuth).
 * Para habilitar ese OAuth hace falta registrar UNA app de MercadoPago con la
 * cuenta de la plataforma (MP_CLIENT_ID / MP_CLIENT_SECRET).
 *
 * Mientras no haya credenciales, `createPreference` devuelve un checkout
 * SIMULADO (una página local) para poder probar el loop completo en el
 * emulador. Cuando el tenant tenga su token, hace el POST real a MP sin
 * cambiar nada del resto del flujo.
 */

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

export interface PreferenceParams {
  tenantId: string;
  orderId: string;
  storeName: string;
  items: PreferenceItem[];
  /** URL base del storefront del tenant (para back_urls / notification). */
  baseUrl: string;
}

export interface PreferenceResult {
  /** URL a la que redirigir al cliente para pagar. */
  checkoutUrl: string;
  /** true si es el checkout simulado (sin credenciales reales). */
  simulated: boolean;
}

/** Access token del comercio para cobrar en su cuenta. */
function resolveAccessToken(tenantMp?: { accessToken?: string }): string | undefined {
  // Prioridad: token del propio tenant (OAuth). Fallback: token de plataforma
  // en env (útil para una cuenta de prueba única en desarrollo).
  return tenantMp?.accessToken ?? process.env.MP_ACCESS_TOKEN ?? undefined;
}

/**
 * Crea una preferencia de pago. Con token real: POST a MP. Sin token:
 * devuelve la URL del checkout simulado local.
 */
export async function createPreference(
  params: PreferenceParams,
  tenantMp?: { accessToken?: string },
): Promise<PreferenceResult> {
  const token = resolveAccessToken(tenantMp);
  const simulatedUrl = `${params.baseUrl}/pago-simulado/${params.orderId}`;

  if (!token) {
    return { checkoutUrl: simulatedUrl, simulated: true };
  }

  // ── Camino real (se ejercita cuando hay credenciales) ──────────────────
  const body = {
    items: params.items.map((it) => ({
      title: it.title,
      quantity: it.quantity,
      unit_price: it.unit_price,
      currency_id: "ARS",
    })),
    external_reference: `${params.tenantId}:${params.orderId}`,
    back_urls: {
      success: `${params.baseUrl}/pedido/${params.orderId}`,
      failure: `${params.baseUrl}/pedido/${params.orderId}`,
      pending: `${params.baseUrl}/pedido/${params.orderId}`,
    },
    auto_return: "approved",
    // El webhook recibe la notificación de acreditación.
    notification_url: `${process.env.MP_WEBHOOK_URL ?? ""}`,
    metadata: { tenantId: params.tenantId, orderId: params.orderId },
  };

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`MercadoPago preference failed: ${res.status}`);
  }
  const data = (await res.json()) as { init_point?: string; sandbox_init_point?: string };
  const checkoutUrl = data.init_point ?? data.sandbox_init_point;
  if (!checkoutUrl) {
    throw new Error("MercadoPago no devolvió init_point");
  }
  return { checkoutUrl, simulated: false };
}

/**
 * Consulta el estado de un pago en MP (usado por el webhook real).
 * Devuelve el estado y el external_reference "tenantId:orderId".
 */
export async function fetchPayment(
  paymentId: string,
  tenantMp?: { accessToken?: string },
): Promise<{ status: string; externalReference: string; amount: number } | null> {
  const token = resolveAccessToken(tenantMp);
  if (!token) return null;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const p = (await res.json()) as {
    status?: string;
    external_reference?: string;
    transaction_amount?: number;
  };
  return {
    status: p.status ?? "unknown",
    externalReference: p.external_reference ?? "",
    amount: p.transaction_amount ?? 0,
  };
}
