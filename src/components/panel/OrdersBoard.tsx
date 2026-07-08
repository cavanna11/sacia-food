"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import { useNewOrderSound } from "@/lib/useNewOrderSound";
import type { OrderDoc, OrderStatus } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";

type Order = OrderDoc & { id: string };

const SECTIONS: { title: string; statuses: OrderStatus[] }[] = [
  { title: "Por confirmar", statuses: ["por_confirmar"] },
  { title: "En cocina", statuses: ["recibido", "en_preparacion"] },
  { title: "Listos / en camino", statuses: ["listo", "en_camino"] },
  { title: "Finalizados", statuses: ["entregado", "rechazado"] },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  por_confirmar: "Por confirmar",
  recibido: "Recibido",
  en_preparacion: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  rechazado: "Rechazado",
};

/** Próxima acción principal según el estado y el canal del pedido. */
function nextAction(o: Order): { label: string; to: OrderStatus } | null {
  switch (o.status) {
    case "por_confirmar":
      return { label: "Aceptar", to: "recibido" };
    case "recibido":
      return { label: "A cocina", to: "en_preparacion" };
    case "en_preparacion":
      return { label: "Listo", to: "listo" };
    case "listo":
      return o.channel === "delivery"
        ? { label: "En camino", to: "en_camino" }
        : { label: "Entregado", to: "entregado" };
    case "en_camino":
      return { label: "Entregado", to: "entregado" };
    default:
      return null;
  }
}

/**
 * Cola de pedidos en vivo. Las actualizaciones de estado van directo a
 * Firestore: las rules solo permiten al staff tocar status/paymentStatus,
 * nunca items ni totales.
 */
export function OrdersBoard({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(clientDb, `tenants/${tenantId}/orders`),
      orderBy("createdAt", "desc"),
      limit(100),
    );
    return onSnapshot(
      q,
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderDoc) }))),
      (err) => setError(err.message),
    );
  }, [tenantId]);

  useNewOrderSound(
    orders && orders.length ? Math.max(...orders.map((o) => o.createdAt)) : null,
  );

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        orders: (orders ?? []).filter((o) => s.statuses.includes(o.status)),
      })),
    [orders],
  );

  async function setStatus(o: Order, status: OrderStatus) {
    await updateDoc(doc(clientDb, `tenants/${tenantId}/orders/${o.id}`), {
      status,
      updatedAt: Date.now(),
    });
  }

  async function markPaid(o: Order) {
    await updateDoc(doc(clientDb, `tenants/${tenantId}/orders/${o.id}`), {
      paymentStatus: "paid",
      updatedAt: Date.now(),
    });
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {orders === null ? (
        <p className="mt-8 text-muted">Cargando pedidos…</p>
      ) : orders.length === 0 ? (
        <Card className="mt-8 text-center">
          <p className="font-semibold">Todavía no hay pedidos</p>
          <p className="mt-1 text-sm text-muted">
            Cuando un cliente pida desde tu tienda, aparece acá al instante.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {section.title} ({section.orders.length})
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.orders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onAdvance={(to) => setStatus(o, to)}
                    onReject={() => setStatus(o, "rechazado")}
                    onPaid={() => markPaid(o)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function OrderCard({
  order: o,
  onAdvance,
  onReject,
  onPaid,
}: {
  order: Order;
  onAdvance: (to: OrderStatus) => void;
  onReject: () => void;
  onPaid: () => void;
}) {
  const action = nextAction(o);
  const time = new Date(o.createdAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold">#{o.number}</span>
        <div className="flex items-center gap-1.5">
          <Badge tone="accent">{o.channel === "delivery" ? "Envío" : "Retiro"}</Badge>
          <span className="text-xs text-muted">{time}</span>
        </div>
      </div>

      <p className="mt-1 text-sm">
        {o.customer.name} · <span className="text-muted">{o.customer.phone}</span>
      </p>
      {o.address && <p className="text-sm text-muted">📍 {o.address}</p>}
      {o.notes && <p className="text-sm italic text-muted">“{o.notes}”</p>}

      <ul className="mt-2 border-t border-border-soft pt-2 text-sm">
        {o.items.map((item) => (
          <li key={item.productId} className="flex justify-between gap-2">
            <span>
              {item.qty}× {item.name}
            </span>
            <span className="text-muted">{formatARS(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between border-t border-border-soft pt-2">
        <span className="font-bold">{formatARS(o.total)}</span>
        {o.paymentStatus === "paid" ? (
          <Badge tone="primary">Cobrado</Badge>
        ) : (
          <Badge tone="neutral">Efectivo a cobrar</Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {action && (
          <Button className="flex-1 !py-2 text-xs" onClick={() => onAdvance(action.to)}>
            {action.label}
          </Button>
        )}
        {o.status === "por_confirmar" && (
          <Button variant="danger" className="!py-2 text-xs" onClick={onReject}>
            Rechazar
          </Button>
        )}
        {o.paymentStatus === "pending" && o.status !== "por_confirmar" && o.status !== "rechazado" && (
          <Button variant="secondary" className="!py-2 text-xs" onClick={onPaid}>
            Cobrado
          </Button>
        )}
        {!action && <Badge tone="neutral">{STATUS_LABEL[o.status]}</Badge>}
      </div>
    </Card>
  );
}
