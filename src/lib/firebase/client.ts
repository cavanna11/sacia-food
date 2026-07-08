/**
 * SDK de Firebase para el navegador (storefront y panel).
 * En local se conecta a los emuladores (NEXT_PUBLIC_USE_EMULATORS=true).
 */
import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
