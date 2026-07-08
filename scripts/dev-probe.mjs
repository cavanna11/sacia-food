// Sondas de desarrollo contra createOrder en el emulador:
//   node scripts/dev-probe.mjs paused     → pedido con tienda pausada
//   node scripts/dev-probe.mjs ratelimit  → 4 pedidos seguidos mismo teléfono
const url = "http://127.0.0.1:5001/demo-gestion-pedidos/us-central1/createOrder";

const order = (phone) => ({
  tenantId: "resto-a",
  items: [{ productId: "gaseosa", qty: 1 }],
  customer: { name: "Probe Test", phone },
  channel: "takeaway",
  paymentMethod: "cash",
});

async function call(data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  const body = await res.json();
  return `HTTP ${res.status} → ${body.error?.message ?? `OK pedido #${body.result.number}`}`;
}

const mode = process.argv[2];
if (mode === "paused") {
  console.log("tienda pausada:", await call(order("11 9999-0000")));
} else if (mode === "ratelimit") {
  for (let i = 1; i <= 4; i++) {
    console.log(`pedido ${i}:`, await call(order("11 7777-3333")));
  }
} else if (mode === "blocked") {
  console.log("teléfono bloqueado:", await call(order("11 0000-1111")));
} else if (mode === "zones") {
  const base = order("11 6666-2222");
  const delivery = { ...base, channel: "delivery", address: "Calle Falsa 123" };
  console.log("delivery sin zona:", await call(delivery));
  console.log(
    "delivery zona centro ($1500 + $2500 = $4000):",
    await call({ ...delivery, zoneId: "centro" }),
  );
  console.log("delivery zona inventada:", await call({ ...delivery, zoneId: "hackeo" }));
}
