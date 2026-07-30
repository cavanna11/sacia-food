"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import type { OrderDoc } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui";

type Order = OrderDoc & { id: string };

/**
 * Estadísticas del día, en vivo. Se calculan en el cliente sobre los
 * pedidos de hoy: a esta escala (decenas/cientos de pedidos diarios por
 * local) es más simple y barato que mantener agregados server-side.
 */
export function StatsCards({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const q = query(
      collection(clientDb, `tenants/${tenantId}/orders`),
      where("createdAt", ">=", startOfDay.getTime()),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) =>
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderDoc) }))),
    );
  }, [tenantId]);

  const stats = useMemo(() => {
    const valid = (orders ?? []).filter(
      (o) => o.status !== "rechazado" && o.status !== "pendiente_pago",
    );
    const sales = valid.reduce((sum, o) => sum + o.total, 0);
    const cashPending = valid
      .filter((o) => o.paymentStatus === "pending")
      .reduce((sum, o) => sum + o.total, 0);

    const qtyByProduct = new Map<string, number>();
    for (const o of valid) {
      for (const item of o.items) {
        qtyByProduct.set(item.name, (qtyByProduct.get(item.name) ?? 0) + item.qty);
      }
    }
    const top = [...qtyByProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    return {
      sales,
      count: valid.length,
      avgTicket: valid.length ? Math.round(sales / valid.length) : 0,
      cashPending,
      top,
    };
  }, [orders]);

  if (orders === null) {
    return <p className="text-sm text-muted">Cargando estadísticas…</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Ventas de hoy" value={formatARS(stats.sales)} />
      <Stat label="Pedidos de hoy" value={String(stats.count)} />
      <Stat label="Ticket promedio" value={formatARS(stats.avgTicket)} />
      <Stat label="Efectivo a cobrar" value={formatARS(stats.cashPending)} />
      <Card className="sm:col-span-2 lg:col-span-4">
        <CardTitle>Top productos de hoy</CardTitle>
        {stats.top.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no hay ventas hoy.</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-1 text-sm">
            {stats.top.map(([name, qty], i) => (
              <li key={name} className="flex justify-between">
                <span>
                  <span className="font-semibold text-muted">{i + 1}.</span> {name}
                </span>
                <span className="font-semibold">{qty} u.</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="!p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}
