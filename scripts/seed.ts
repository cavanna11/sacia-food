/**
 * Seed de desarrollo: crea dos tenants con branding distinto y un usuario
 * dueño para cada uno (con custom claims tenantId+role).
 *
 * Requiere los emuladores corriendo:  npm run emulators
 * Luego:                              npm run seed
 *
 * Es idempotente: se puede correr las veces que haga falta.
 */
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({ projectId: "demo-gestion-pedidos" });
const db = getFirestore(app);
const auth = getAuth(app);

/** Logo SVG simple como data URI: círculo con la inicial del comercio. */
function logoDataUri(initial: string, bg: string, fg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/><text x="32" y="42" font-family="Arial" font-size="30" font-weight="bold" fill="${fg}" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const TENANTS = [
  {
    id: "resto-a",
    branding: {
      name: "Resto A · Burgers",
      logoUrl: logoDataUri("A", "#e11d48", "#ffffff"),
      colors: { primary: "#e11d48", accent: "#f59e0b", mode: "light" as const },
      font: "sans",
    },
    owner: { email: "dueno@resto-a.test", password: "secret123" },
    products: [
      { id: "clasica", name: "Burger Clásica", description: "Carne, cheddar, lechuga y tomate", price: 8500, category: "Hamburguesas", available: true },
      { id: "doble", name: "Doble Cheddar", description: "Doble carne, doble cheddar, panceta", price: 11000, category: "Hamburguesas", available: true },
      { id: "papas", name: "Papas con cheddar", description: "Porción grande", price: 5500, category: "Acompañamientos", available: true },
      { id: "gaseosa", name: "Gaseosa 500ml", price: 2500, category: "Bebidas", available: true },
    ],
  },
  {
    id: "resto-b",
    branding: {
      name: "Resto B · Pizzas",
      logoUrl: logoDataUri("B", "#059669", "#ffffff"),
      colors: { primary: "#059669", accent: "#84cc16", mode: "dark" as const },
      font: "sans",
    },
    owner: { email: "dueno@resto-b.test", password: "secret123" },
    products: [
      { id: "muzza", name: "Muzzarella", description: "Salsa, muzza y aceitunas", price: 9000, category: "Pizzas", available: true },
      { id: "napo", name: "Napolitana", description: "Muzza, tomate en rodajas y ajo", price: 10500, category: "Pizzas", available: true },
      { id: "faina", name: "Fainá", price: 2000, category: "Acompañamientos", available: true },
      { id: "birra", name: "Cerveza artesanal 473ml", price: 4000, category: "Bebidas", available: true },
    ],
  },
];

async function ensureUser(email: string, password: string) {
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return await auth.createUser({ email, password, emailVerified: true });
  }
}

async function main() {
  for (const t of TENANTS) {
    await db.doc(`tenants/${t.id}`).set(
      {
        subdomain: t.id,
        plan: "gestion",
        status: "active",
        branding: t.branding,
        config: {
          acceptingOrders: true,
          deliveryZones: [
            { id: "centro", name: "Centro", fee: 1500 },
            { id: "norte", name: "Zona Norte", fee: 2500 },
          ],
        },
        createdAt: Date.now(),
      },
      { merge: true },
    );

    for (const { id, ...product } of t.products) {
      await db.doc(`tenants/${t.id}/products/${id}`).set(
        { ...product, createdAt: Date.now(), updatedAt: Date.now() },
        { merge: true },
      );
    }

    const user = await ensureUser(t.owner.email, t.owner.password);
    // La cerradura 3: el usuario queda atado a su tenant vía custom claims.
    await auth.setCustomUserClaims(user.uid, { tenantId: t.id, role: "owner" });
    await db.doc(`tenants/${t.id}/members/${user.uid}`).set(
      { email: t.owner.email, role: "owner", createdAt: Date.now() },
      { merge: true },
    );

    console.log(`✔ tenant "${t.id}" listo — panel: http://${t.id}.localhost:3000/panel`);
    console.log(`   login: ${t.owner.email} / ${t.owner.password}`);
  }
  console.log("\nSeed completado.");
}

main().then(() => process.exit(0), (err) => {
  console.error("Seed falló:", err.message);
  console.error("¿Están corriendo los emuladores? (npm run emulators)");
  process.exit(1);
});
