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
import { useNewOrderSound } from "@/lib/useNewOrderSound";
import type { OrderDoc, OrderStatus } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

type Order = OrderDoc & { id: string };

/** Umbrales de antigüedad del pedido en cocina (minutos). */
const WARN_MIN = 10;
const LATE_MIN = 20;

/**
 * KDS (Kitchen Display System): reemplaza la comanda de papel.
 * Muestra lo aceptado y en preparación, con timer y color por antigüedad.
 * Pensado para una pantalla/tablet dedicada en la cocina.
 */
export function KitchenDisplay({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const q = query(
      collection(clientDb, `tenants/${tenantId}/orders`),
      orderBy("createdAt", "desc"),
      limit(60),
    );
    return onSnapshot(q, (snap) =>
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderDoc) }))),
    );
  }, [tenantId]);

  // Timer visual: refresco cada 15 s alcanza para mm.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const kitchen = useMemo(
    () =>
      (orders ?? [])
        .filter((o) => o.status === "recibido" || o.status === "en_preparacion")
        .sort((a, b) => a.createdAt - b.createdAt), // el más viejo primero
    [orders],
  );

  useNewOrderSound(kitchen.length ? Math.max(...kitchen.map((o) => o.createdAt)) : null);

  async function advance(o: Order, to: OrderStatus) {
    await updateDoc(doc(clientDb, `tenants/${tenantId}/orders/${o.id}`), {
      status: to,
      updatedAt: Date.now(),
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Cocina</h1>
        <Badge tone="accent">{kitchen.length} en cola</Badge>
      </div>

      {orders === null ? (
        <p className="mt-8 text-muted">Cargando…</p>
      ) : kitchen.length === 0 ? (
        <p className="mt-16 text-center text-2xl font-semibold text-muted">
          Cocina al día ✨
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kitchen.map((o) => (
            <KitchenCard key={o.id} order={o} now={now} onAdvance={advance} />
          ))}
        </div>
      )}
    </>
  );
}

function KitchenCard({
  order: o,
  now,
  onAdvance,
}: {
  order: Order;
  now: number;
  onAdvance: (o: Order, to: OrderStatus) => void;
}) {
  const ageMin = Math.floor((now - o.createdAt) / 60000);
  const tone =
    ageMin >= LATE_MIN
      ? "border-red-500 bg-red-500/5"
      : ageMin >= WARN_MIN
        ? "border-amber-500 bg-amber-500/5"
        : "border-border-soft bg-card";

  return (
    <div className={`rounded-card border-2 p-4 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black">#{o.number}</span>
        <div className="flex items-center gap-2">
          <Badge tone="accent">{o.channel === "delivery" ? "Envío" : "Retiro"}</Badge>
          <span
            className={`text-lg font-bold tabular-nums ${
              ageMin >= LATE_MIN
                ? "text-red-600"
                : ageMin >= WARN_MIN
                  ? "text-amber-600"
                  : "text-muted"
            }`}
          >
            {ageMin}′
          </span>
        </div>
      </div>

      <ul className="mt-3 text-lg leading-snug">
        {o.items.map((item) => (
          <li key={item.productId}>
            <span className="font-bold">{item.qty}×</span> {item.name}
          </li>
        ))}
      </ul>
      {o.notes && (
        <p className="mt-2 rounded-control bg-accent/10 px-2 py-1 text-sm font-medium text-accent">
          ⚠ {o.notes}
        </p>
      )}

      <div className="mt-4">
        {o.status === "recibido" ? (
          <Button className="w-full !py-3" onClick={() => onAdvance(o, "en_preparacion")}>
            Empezar
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full !py-3"
            onClick={() => onAdvance(o, "listo")}
          >
            ¡Listo! 🛎
          </Button>
        )}
      </div>
    </div>
  );
}
