"use client";

import { useEffect, useState, type FormEvent } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { getOpenState } from "@/lib/opening-hours";
import type { TenantConfig, TenantDoc } from "@/lib/types";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@/components/ui";

/**
 * Configuración operativa del comercio. Escribe solo la clave `config`
 * del doc del tenant (las rules bloquean cualquier otro campo: plan,
 * branding y subdominio no se tocan desde acá).
 */
export function ConfigForm({ tenantId }: { tenantId: string }) {
  const [config, setConfig] = useState<TenantConfig | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(doc(clientDb, `tenants/${tenantId}`), (snap) => {
      const data = snap.data() as TenantDoc | undefined;
      setConfig(data?.config ?? null);
    });
  }, [tenantId]);

  if (config === undefined) {
    return <p className="text-muted">Cargando configuración…</p>;
  }

  const accepting = config?.acceptingOrders !== false;
  const openState = getOpenState(config ?? undefined);

  async function save(next: TenantConfig) {
    setError(null);
    setSaved(false);
    try {
      await updateDoc(doc(clientDb, `tenants/${tenantId}`), {
        config: next,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
    }
  }

  async function handleHours(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const open = String(form.get("open"));
    const close = String(form.get("close"));
    await save({
      acceptingOrders: accepting,
      ...(open && close ? { hours: { open, close } } : {}),
    });
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>

      <Card className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Recepción de pedidos</CardTitle>
            <CardDescription>
              Pausá la tienda al toque cuando la cocina no da abasto.{" "}
              {openState.open ? (
                <Badge tone="primary">Abierta ahora</Badge>
              ) : (
                <Badge tone="neutral">
                  {openState.reason === "paused" ? "Pausada" : "Fuera de horario"}
                </Badge>
              )}
            </CardDescription>
          </div>
          <Button
            variant={accepting ? "danger" : "primary"}
            onClick={() => save({ ...(config ?? { acceptingOrders: true }), acceptingOrders: !accepting })}
          >
            {accepting ? "Pausar pedidos" : "Reanudar pedidos"}
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>Horario de apertura</CardTitle>
        <CardDescription>
          Fuera de este horario la tienda muestra “cerrado” y no acepta pedidos.
          Soporta ventanas que cruzan medianoche (ej. 20:00 a 02:00). Dejá vacío
          para atender 24 hs.
        </CardDescription>
        <form onSubmit={handleHours} className="mt-4 flex flex-wrap items-end gap-4">
          <Input label="Abre" name="open" type="time" defaultValue={config?.hours?.open} />
          <Input label="Cierra" name="close" type="time" defaultValue={config?.hours?.close} />
          <Button type="submit">Guardar horario</Button>
        </form>
        {saved && <p className="mt-3 text-sm font-medium text-green-600">Guardado ✓</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>
    </>
  );
}
