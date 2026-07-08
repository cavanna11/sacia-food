/**
 * SDK Admin de Firebase — SOLO server-side (Server Components, Route Handlers).
 * Nunca importar desde un componente cliente.
 *
 * En local: con FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST seteados
 * (ver .env.local) el Admin SDK habla con los emuladores sin credenciales.
 * En prod: FIREBASE_SERVICE_ACCOUNT (JSON del service account) en Vercel.
 */
import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)), projectId });
  }
  // Emuladores o Application Default Credentials.
  return initializeApp({ projectId });
}

const adminApp = initAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
