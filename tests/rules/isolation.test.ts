/**
 * Test de aislamiento multi-tenant (Definition of Done de la Fase 0).
 *
 * Corre contra el emulador de Firestore con las reglas reales del repo:
 *   npm run test:rules
 *
 * El caso central: un usuario de Resto A intenta, a propósito, leer un
 * pedido de Resto B por su ID. Las Security Rules deben devolver
 * PERMISSION_DENIED — la base rechaza, no el frontend.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

let env: RulesTestEnvironment;

const OWNER_A = { tenantId: "resto-a", role: "owner" };
const OWNER_B = { tenantId: "resto-b", role: "owner" };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-gestion-pedidos",
    firestore: {
      rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
    },
  });

  // Datos semilla (Admin SDK, sin reglas): un pedido y un producto por tenant.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const t of ["resto-a", "resto-b"]) {
      await setDoc(doc(db, `tenants/${t}`), {
        subdomain: t,
        branding: { name: t, colors: { primary: "#000", accent: "#fff", mode: "light" } },
      });
      await setDoc(doc(db, `tenants/${t}/orders/order-1`), {
        total: 1000,
        status: "por_confirmar",
        paymentStatus: "pending",
        updatedAt: 0,
      });
      await setDoc(doc(db, `tenants/${t}/products/prod-1`), { name: "Producto", price: 500 });
      await setDoc(doc(db, `tenants/${t}/customers/cust-1`), { phone: "+54..." });
      await setDoc(doc(db, `tenants/${t}/payments/pay-1`), {
        orderId: "order-1",
        provider: "simulado",
        status: "approved",
        amount: 1000,
      });
      await setDoc(doc(db, `tenants/${t}/tracking/order-1`), {
        number: 1,
        status: "recibido",
        channel: "takeaway",
        total: 1000,
      });
    }
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe("aislamiento entre tenants", () => {
  it("DENIEGA a un usuario de Resto A leer un pedido de Resto B por ID", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(getDoc(doc(dbA, "tenants/resto-b/orders/order-1")));
  });

  it("DENIEGA a Resto A listar los pedidos de Resto B", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(getDocs(collection(dbA, "tenants/resto-b/orders")));
  });

  it("DENIEGA a Resto A leer los clientes de Resto B", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(getDoc(doc(dbA, "tenants/resto-b/customers/cust-1")));
  });

  it("DENIEGA a Resto A escribir productos de Resto B", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      setDoc(doc(dbA, "tenants/resto-b/products/hackeado"), { name: "x", price: 1 }),
    );
  });

  it("PERMITE a cada dueño leer los pedidos de su propio tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    const dbB = env.authenticatedContext("user-b", OWNER_B).firestore();
    await assertSucceeds(getDoc(doc(dbA, "tenants/resto-a/orders/order-1")));
    await assertSucceeds(getDoc(doc(dbB, "tenants/resto-b/orders/order-1")));
  });

  it("PERMITE al staff administrar el catálogo de su propio tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(
      setDoc(doc(dbA, "tenants/resto-a/products/nuevo"), { name: "Burga", price: 9000 }),
    );
  });
});

describe("acceso anónimo (cliente final sin cuenta)", () => {
  it("PERMITE leer el doc del tenant (branding) y el menú", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "tenants/resto-a")));
    await assertSucceeds(getDocs(collection(db, "tenants/resto-a/products")));
  });

  it("DENIEGA leer pedidos y clientes sin estar logueado", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "tenants/resto-a/orders/order-1")));
    await assertFails(getDoc(doc(db, "tenants/resto-a/customers/cust-1")));
  });

  it("DENIEGA enumerar los tenants de la plataforma", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, "tenants")));
  });
});

describe("escrituras sensibles bloqueadas al cliente", () => {
  it("DENIEGA crear pedidos desde el cliente, incluso en el propio tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      setDoc(doc(dbA, "tenants/resto-a/orders/nuevo"), { total: 1, status: "nuevo" }),
    );
  });

  it("DENIEGA modificar el doc del tenant (plan, branding) desde el cliente", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(setDoc(doc(dbA, "tenants/resto-a"), { plan: "pro" }));
  });

  it("DENIEGA leer los secretos privados del propio tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(getDoc(doc(dbA, "tenants/resto-a/private/secrets")));
  });
});

describe("operación de pedidos por el staff (campos restringidos)", () => {
  it("PERMITE al staff avanzar el estado de un pedido propio", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(dbA, "tenants/resto-a/orders/order-1"), {
        status: "recibido",
        updatedAt: Date.now(),
      }),
    );
  });

  it("PERMITE al staff marcar cobrado un pedido propio", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(dbA, "tenants/resto-a/orders/order-1"), {
        paymentStatus: "paid",
        updatedAt: Date.now(),
      }),
    );
  });

  it("DENIEGA al staff modificar el total de un pedido", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      updateDoc(doc(dbA, "tenants/resto-a/orders/order-1"), {
        total: 1,
        updatedAt: Date.now(),
      }),
    );
  });

  it("DENIEGA al staff operar pedidos de OTRO tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      updateDoc(doc(dbA, "tenants/resto-b/orders/order-1"), {
        status: "recibido",
        updatedAt: Date.now(),
      }),
    );
  });

  it("DENIEGA a un anónimo tocar un pedido", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, "tenants/resto-a/orders/order-1"), { status: "entregado" }),
    );
  });
});

describe("config operativa del tenant (solo el dueño, solo esa clave)", () => {
  it("PERMITE al dueño editar la config de su tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(dbA, "tenants/resto-a"), {
        config: { acceptingOrders: false },
      }),
    );
  });

  it("DENIEGA al dueño cambiarse el plan o el subdominio", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(updateDoc(doc(dbA, "tenants/resto-a"), { plan: "pro" }));
    await assertFails(
      updateDoc(doc(dbA, "tenants/resto-a"), {
        config: { acceptingOrders: true },
        subdomain: "otro",
      }),
    );
  });

  it("DENIEGA al dueño de A tocar la config de B", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      updateDoc(doc(dbA, "tenants/resto-b"), { config: { acceptingOrders: false } }),
    );
  });

  it("DENIEGA a un rol no-dueño (cocina) editar la config", async () => {
    const dbK = env
      .authenticatedContext("cook", { tenantId: "resto-a", role: "kitchen" })
      .firestore();
    await assertFails(
      updateDoc(doc(dbK, "tenants/resto-a"), { config: { acceptingOrders: false } }),
    );
  });
});

describe("editor de marca (branding: solo el dueño, solo esa clave)", () => {
  const newBranding = {
    name: "Nuevo Nombre",
    colors: { primary: "#e11d48", accent: "#f59e0b", mode: "dark" },
  };

  it("PERMITE al dueño editar el branding de su tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(dbA, "tenants/resto-a"), { branding: newBranding }),
    );
  });

  it("PERMITE al dueño editar branding y config a la vez", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(dbA, "tenants/resto-a"), {
        branding: newBranding,
        config: { acceptingOrders: true },
      }),
    );
  });

  it("DENIEGA cambiar el plan aunque venga junto al branding", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      updateDoc(doc(dbA, "tenants/resto-a"), { branding: newBranding, plan: "pro" }),
    );
  });

  it("DENIEGA al dueño de A tocar el branding de B", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      updateDoc(doc(dbA, "tenants/resto-b"), { branding: newBranding }),
    );
  });

  it("DENIEGA a un rol no-dueño (cocina) editar el branding", async () => {
    const dbK = env
      .authenticatedContext("cook", { tenantId: "resto-a", role: "kitchen" })
      .firestore();
    await assertFails(
      updateDoc(doc(dbK, "tenants/resto-a"), { branding: newBranding }),
    );
  });
});

describe("lista negra de teléfonos (staff del tenant)", () => {
  it("PERMITE al staff bloquear y desbloquear en su tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(
      setDoc(doc(dbA, "tenants/resto-a/blocklist/1155550000"), {
        phone: "11 5555-0000",
        createdAt: Date.now(),
      }),
    );
    await assertSucceeds(getDoc(doc(dbA, "tenants/resto-a/blocklist/1155550000")));
  });

  it("DENIEGA al staff de A tocar la blocklist de B", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      setDoc(doc(dbA, "tenants/resto-b/blocklist/1155550000"), { phone: "x" }),
    );
    await assertFails(getDocs(collection(dbA, "tenants/resto-b/blocklist")));
  });

  it("DENIEGA a un anónimo leer la blocklist", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "tenants/resto-a/blocklist/1155550000")));
  });
});

describe("eventos de pago (staff lee, nadie escribe)", () => {
  it("PERMITE al staff ver los pagos de su tenant", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertSucceeds(getDoc(doc(dbA, "tenants/resto-a/payments/pay-1")));
    await assertSucceeds(getDocs(collection(dbA, "tenants/resto-a/payments")));
  });

  it("DENIEGA al staff de A ver los pagos de B", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(getDoc(doc(dbA, "tenants/resto-b/payments/pay-1")));
  });

  it("DENIEGA escribir un pago desde el cliente (solo webhook/simulador)", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      setDoc(doc(dbA, "tenants/resto-a/payments/hackeo"), {
        orderId: "order-1",
        status: "approved",
        amount: 1,
      }),
    );
  });

  it("DENIEGA a un anónimo leer los pagos", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "tenants/resto-a/payments/pay-1")));
  });
});

describe("tracking público del pedido (sin PII)", () => {
  it("PERMITE a un anónimo leer el tracking por ID exacto", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "tenants/resto-a/tracking/order-1")));
  });

  it("DENIEGA listar los trackings (los IDs no se descubren)", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, "tenants/resto-a/tracking")));
  });

  it("DENIEGA escribir el tracking desde el cliente (solo el trigger)", async () => {
    const dbA = env.authenticatedContext("user-a", OWNER_A).firestore();
    await assertFails(
      updateDoc(doc(dbA, "tenants/resto-a/tracking/order-1"), { status: "entregado" }),
    );
  });
});
