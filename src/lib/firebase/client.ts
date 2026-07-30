/**
 * SDK de Firebase para el navegador (storefront y panel).
 * En local se conecta a los emuladores (NEXT_PUBLIC_USE_EMULATORS=true).
 */
import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

// Fallbacks no-vacíos: si faltan las env vars (ej. build de Vercel sin
// configurar), `getAuth` NO debe tirar auth/invalid-api-key y romper el build.
// Con las variables reales seteadas, estos placeholders nunca se usan.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "missing-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-gestion-pedidos",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo-app-id",
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const clientAuth = getAuth(app);
export const clientDb = getFirestore(app);
export const clientFunctions = getFunctions(app);

declare global {
  // Evita reconectar emuladores con el hot reload de Next.
  var __emulatorsConnected: boolean | undefined;
}

if (
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
  typeof window !== "undefined" &&
  !globalThis.__emulatorsConnected
) {
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
  connectFunctionsEmulator(clientFunctions, "127.0.0.1", 5001);
  globalThis.__emulatorsConnected = true;
}
