"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { clientDb, clientFunctions } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import type { TrackingDoc } from "@/lib/types";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui";

/**
 * Pantalla de pago simulada: reemplaza al checkout de MercadoPago mientras
 * no hay credenciales reales. Llama a la Cloud Function `simulatePayment`
 * (solo activa en el emulador), que aplica el pago con la MISMA lógica
 * idempotente que usará el webhook real.
 */
export function SimulatedCheckout({
  tenantId,
  orderId,
}: {
  tenantId: string;
  orderId: string;
}) {
  const router = useRouter();
  const [tracking, setTracking] = useState<TrackingDoc | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      doc(clientDb, `tenants/${tenantId}/tracking/${orderId}`),
      (snap) => setTracking(snap.exists() ? (snap.data() as TrackingDoc) : null),
      () => setTracking(null),
    );
  }, [tenantId, orderId]);

  async function pay(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const call = httpsCallable(clientFunctions, "simulatePayment");
      await call({ tenantId, orderId, approve });
      router.push(`/pedido/${orderId}`);
    } catch {
      setError("No se pudo procesar. ¿Están corriendo los emuladores?");
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🧪</span>
        <Badge tone="neutral">Modo prueba</Badge>
      </div>
      <CardTitle className="mt-3 text-xl">Pago simulado</CardTitle>
      <CardDescription>
        Esta pantalla reemplaza a MercadoPago mientras el comercio no conectó
        su cuenta. En producción, acá estaría el checkout real de MercadoPago.
      </CardDescription>

      {tracking === undefined ? (
        <p className="mt-6 text-muted">Cargando…</p>
      ) : tracking === null ? (
        <p className="mt-6 text-red-600">No encontramos el pedido.</p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">Pedido #{tracking.number}</p>
          <p className="text-3xl font-black">{formatARS(tracking.total)}</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <Button className="w-full !py-3" disabled={busy} onClick={() => pay(true)}>
              {busy ? "Procesando…" : "Pagar (aprobar)"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() => pay(false)}
            >
              Rechazar el pago
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
