/**
 * Utilidad de desarrollo: cambia el estado de un pedido contra el emulador,
 * simulando la acción del staff (dispara el trigger syncTracking).
 *
 *   npx tsx scripts/dev-set-status.ts <tenantId> <orderId> <status>
 */
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [, , tenantId, orderId, status] = process.argv;
if (!tenantId || !orderId || !status) {
  console.error("Uso: npx tsx scripts/dev-set-status.ts <tenantId> <orderId> <status>");
  process.exit(1);
}

const db = getFirestore(initializeApp({ projectId: "demo-gestion-pedidos" }));
db.doc(`tenants/${tenantId}/orders/${orderId}`)
  .update({ status, updatedAt: Date.now() })
  .then(() => {
    console.log(`pedido ${orderId} -> ${status}`);
    process.exit(0);
  });
