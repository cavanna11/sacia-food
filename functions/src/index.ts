/**
 * Cloud Functions — esqueleto Fase 0.
 *
 * Acá vive TODA la lógica sensible del sistema. El frontend pide,
 * el backend decide. Cada función valida el tenant antes de tocar datos.
 *
 * Roadmap de funciones (se implementan en fases siguientes):
 *  - createOrder      (Fase 1): valida anti-fraude y crea el pedido.
 *  - confirmPayment   (Fase 1): webhook de MercadoPago, idempotente.
 *  - provisionTenant  (Fase 2): alta self-service, clona plantilla.
 *  - changePlan       (Fase 2): upgrade/downgrade de suscripción.
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

/** Claims tipados que estampa el sistema al crear usuarios de un tenant. */
interface TenantClaims {
  tenantId?: string;
  role?: string;
}

/**
 * Ping de salud con validación de tenant: prueba de que el patrón
 * "callable + verificación de claims" funciona de punta a punta.
 */
export const ping = onCall(async (request) => {
  const claims = (request.auth?.token ?? {}) as TenantClaims;
  const tenantId = request.data?.tenantId as string | undefined;

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Necesitás iniciar sesión.");
  }
  if (!tenantId || claims.tenantId !== tenantId) {
    // La regla de oro: el backend re-valida el tenant SIEMPRE,
    // aunque el frontend ya lo haya hecho.
    throw new HttpsError("permission-denied", "No pertenecés a este comercio.");
  }

  const tenant = await db.doc(`tenants/${tenantId}`).get();
  if (!tenant.exists) {
    throw new HttpsError("not-found", "El comercio no existe.");
  }

  return { ok: true, tenantId, at: Date.now() };
});
