"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
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

  /** Base actual de la config para no pisar claves al guardar parciales. */
  function baseConfig(): TenantConfig {
    return { acceptingOrders: accepting, ...(config ?? {}) };
  }

  async function handleHours(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const open = String(form.get("open"));
    const close = String(form.get("close"));
    const { hours: _drop, ...rest } = baseConfig();
    await save({
      ...rest,
      ...(open && close ? { hours: { open, close } } : {}),
    });
  }

  async function addZone(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get("zoneName")).trim();
    const fee = Number(form.get("zoneFee"));
    if (!name || !Number.isFinite(fee) || fee < 0) return;
    const base = baseConfig();
    await save({
      ...base,
      deliveryZones: [
        ...(base.deliveryZones ?? []),
        { id: crypto.randomUUID().slice(0, 8), name, fee: Math.round(fee) },
      ],
    });
    formEl.reset();
  }

  async function removeZone(id: string) {
    const base = baseConfig();
    await save({
      ...base,
      deliveryZones: (base.deliveryZones ?? []).filter((z) => z.id !== id),
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

      <Card className="mt-4">
        <CardTitle>Zonas de reparto</CardTitle>
        <CardDescription>
          Cada zona tiene su costo de envío. Si cargás al menos una, el
          cliente debe elegir zona al pedir con envío y el costo se suma solo.
          Sin zonas, el envío no tiene recargo.
        </CardDescription>

        {(config?.deliveryZones ?? []).length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {config!.deliveryZones!.map((z) => (
              <li
                key={z.id}
                className="flex items-center justify-between rounded-control border border-border-soft px-3 py-2 text-sm"
              >
                <span className="font-medium">{z.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold">
                    {z.fee === 0 ? "Gratis" : `$ ${z.fee.toLocaleString("es-AR")}`}
                  </span>
                  <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => removeZone(z.id)}>
                    Quitar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addZone} className="mt-4 flex flex-wrap items-end gap-4">
          <Input label="Zona" name="zoneName" placeholder="Ej: Centro" required />
          <Input label="Costo de envío (ARS)" name="zoneFee" type="number" min="0" step="1" required />
          <Button type="submit" variant="secondary">
            Agregar zona
          </Button>
        </form>
      </Card>

      <Blocklist tenantId={tenantId} />
    </>
  );
}

/** Lista negra de teléfonos: los pedidos de estos números se rechazan solos. */
function Blocklist({ tenantId }: { tenantId: string }) {
  const [entries, setEntries] = useState<{ id: string; phone: string; reason?: string }[]>([]);

  useEffect(() => {
    return onSnapshot(collection(clientDb, `tenants/${tenantId}/blocklist`), (snap) =>
      setEntries(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as { phone: string; reason?: string }) })),
      ),
    );
  }, [tenantId]);

  async function block(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const phone = String(form.get("phone")).trim();
    const phoneKey = phone.replace(/\D/g, "");
    if (phoneKey.length < 6) return;
    await setDoc(doc(clientDb, `tenants/${tenantId}/blocklist/${phoneKey}`), {
      phone,
      reason: String(form.get("reason")).trim(),
      createdAt: Date.now(),
    });
    formEl.reset();
  }

  return (
    <Card className="mt-4">
      <CardTitle>Teléfonos bloqueados</CardTitle>
      <CardDescription>
        Los pedidos de estos números se rechazan automáticamente, sin avisarle
        al que molesta que está bloqueado.
      </CardDescription>

      {entries.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-control border border-border-soft px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{entry.phone}</span>
                {entry.reason && <span className="text-muted"> · {entry.reason}</span>}
              </span>
              <Button
                variant="ghost"
                className="!px-2 !py-1 text-xs"
                onClick={() =>
                  deleteDoc(doc(clientDb, `tenants/${tenantId}/blocklist/${entry.id}`))
                }
              >
                Desbloquear
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={block} className="mt-4 flex flex-wrap items-end gap-4">
        <Input label="Teléfono" name="phone" type="tel" placeholder="11 5555-5555" required />
        <Input label="Motivo (opcional)" name="reason" placeholder="Pedidos falsos" />
        <Button type="submit" variant="danger">
          Bloquear
        </Button>
      </form>
    </Card>
  );
}
