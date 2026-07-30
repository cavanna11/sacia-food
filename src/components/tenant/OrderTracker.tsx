"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import type { OrderStatus, TrackingDoc } from "@/lib/types";
import { Badge, Card, CardTitle } from "@/components/ui";

/** Pasos visibles del tracking, según el canal. */
function stepsFor(channel: TrackingDoc["channel"]): { status: OrderStatus; label: string }[] {
  return [
    { status: "por_confirmar", label: "Enviado al local" },
    { status: "recibido", label: "Confirmado" },
    { status: "en_preparacion", label: "En preparación" },
    { status: "listo", label: channel === "delivery" ? "Listo para salir" : "Listo para retirar" },
    ...(channel === "delivery"
      ? [{ status: "en_camino" as OrderStatus, label: "En camino" }]
      : []),
    { status: "entregado", label: "Entregado" },
  ];
}

/** Estado del pedido en tiempo real, leyendo el espejo público sin PII. */
export function OrderTracker({
  tenantId,
  orderId,
}: {
  tenantId: string;
  orderId: string;
}) {
  const [tracking, setTracking] = useState<TrackingDoc | null | undefined>(undefined);

  useEffect(() => {
    return onSnapshot(
      doc(clientDb, `tenants/${tenantId}/tracking/${orderId}`),
      (snap) => setTracking(snap.exists() ? (snap.data() as TrackingDoc) : null),
      () => setTracking(null),
    );
  }, [tenantId, orderId]);

  if (tracking === undefined) {
    return <p className="text-center text-muted">Buscando tu pedido…</p>;
  }

  if (tracking === null) {
    return (
      <Card className="text-center">
        <CardTitle>No encontramos ese pedido</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Revisá el link que te dimos al confirmar la compra.
        </p>
      </Card>
    );
  }

  if (tracking.status === "rechazado") {
    return (
      <Card className="text-center">
        <CardTitle>Pedido #{tracking.number} — no pudo tomarse</CardTitle>
        <p className="mt-2 text-sm text-muted">
          El local no pudo aceptar tu pedido esta vez. Si ya pagaste,
          comunicate con el local para resolverlo.
        </p>
      </Card>
    );
  }

  if (tracking.status === "pendiente_pago") {
    return (
      <Card className="text-center">
        <p className="text-4xl">⏳</p>
        <CardTitle className="mt-2">Esperando tu pago</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Total {formatARS(tracking.total)}. Apenas se acredite el pago por
          MercadoPago, el local recibe tu pedido y esta pantalla se actualiza sola.
        </p>
      </Card>
    );
  }

  const steps = stepsFor(tracking.channel);
  const currentIdx = steps.findIndex((s) => s.status === tracking.status);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl">Pedido #{tracking.number}</CardTitle>
        <Badge tone="accent">
          {tracking.channel === "delivery" ? "Envío" : "Retiro"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Total {formatARS(tracking.total)} · se actualiza solo, no hace falta recargar
      </p>

      <ol className="mt-6 flex flex-col gap-0">
        {steps.map((step, i) => {
          const done = i < currentIdx;
          const current = i === currentIdx;
          return (
            <li key={step.status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-primary text-on-primary"
                      : current
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-border-soft text-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span
                    className={`h-6 w-0.5 ${done ? "bg-primary" : "bg-border-soft"}`}
                  />
                )}
              </div>
              <span
                className={`pt-1 text-sm ${
                  current ? "font-bold" : done ? "text-strong" : "text-muted"
                }`}
              >
                {step.label}
                {current && step.status !== "entregado" && (
                  <span className="ml-2 inline-block animate-pulse text-primary">●</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
