"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { contrastOn } from "@/lib/color";
import { BRAND_PALETTES, findPaletteByPrimary } from "@/lib/palettes";
import type { TenantBranding, TenantDoc } from "@/lib/types";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@/components/ui";

/**
 * Editor de marca del comercio: nombre, paleta de colores (elegida de un set
 * curado) y modo claro/oscuro. Escribe solo la clave `branding` del tenant
 * (las rules bloquean plan, subdominio y estado). Muestra una preview en vivo
 * antes de publicar, como pide el spec.
 */
export function BrandEditor({ tenantId }: { tenantId: string }) {
  const [branding, setBranding] = useState<TenantBranding | null | undefined>(undefined);
  const [draft, setDraft] = useState<TenantBranding | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(doc(clientDb, `tenants/${tenantId}`), (snap) => {
      const data = snap.data() as TenantDoc | undefined;
      const b = data?.branding ?? null;
      setBranding(b);
      // Inicializa el borrador la primera vez que llega el branding.
      setDraft((prev) => prev ?? (b ? structuredClone(b) : null));
    });
  }, [tenantId]);

  if (branding === undefined || draft === null) {
    return (
      <Card className="mt-4">
        <CardTitle>Marca de tu tienda</CardTitle>
        <CardDescription>Cargando…</CardDescription>
      </Card>
    );
  }

  const selectedPaletteId = findPaletteByPrimary(draft.colors.primary)?.id ?? null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(branding);

  function update(patch: Partial<TenantBranding>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setSaved(false);
  }

  function pickPalette(primary: string, accent: string) {
    setDraft((d) =>
      d ? { ...d, colors: { ...d.colors, primary, accent } } : d,
    );
    setSaved(false);
  }

  async function publish() {
    if (!draft) return;
    const name = draft.name.trim();
    if (name.length < 2) {
      setError("El nombre del comercio necesita al menos 2 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(clientDb, `tenants/${tenantId}`), {
        branding: { ...draft, name },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardTitle>Marca de tu tienda</CardTitle>
      <CardDescription>
        Tu logo, nombre y colores. Elegí una paleta y mirá la preview antes de
        publicar — todas están validadas para que siempre se lea bien.
      </CardDescription>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {/* Controles */}
        <div className="flex flex-col gap-5">
          <Input
            label="Nombre del comercio"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            maxLength={60}
          />

          <div>
            <p className="text-sm font-medium text-strong">Paleta de colores</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {BRAND_PALETTES.map((pal) => {
                const active = selectedPaletteId === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => pickPalette(pal.primary, pal.accent)}
                    title={pal.name}
                    aria-label={pal.name}
                    aria-pressed={active}
                    className={`flex h-11 items-center justify-center gap-1 rounded-control border-2 transition-transform hover:scale-105 ${
                      active ? "border-strong" : "border-transparent"
                    }`}
                    style={{ background: pal.primary }}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ background: pal.accent }}
                    />
                    {active && (
                      <span style={{ color: contrastOn(pal.primary) }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-strong">Modo del storefront</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    update({ colors: { ...draft.colors, mode } })
                  }
                  aria-pressed={draft.colors.mode === mode}
                  className={`rounded-control border px-3 py-2.5 text-sm font-medium transition-colors ${
                    draft.colors.mode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border-soft text-muted hover:text-strong"
                  }`}
                >
                  {mode === "light" ? "Claro ☀️" : "Oscuro 🌙"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview en vivo */}
        <BrandPreview branding={draft} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={publish} disabled={!dirty || saving}>
          {saving ? "Publicando…" : dirty ? "Publicar cambios" : "Publicado"}
        </Button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={() => setDraft(structuredClone(branding))}
            className="text-sm text-muted hover:text-strong"
          >
            Descartar
          </button>
        )}
        {saved && <span className="text-sm font-medium text-green-600">Guardado ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </Card>
  );
}

/** Mini-storefront de muestra con los tokens del borrador. */
function BrandPreview({ branding }: { branding: TenantBranding }) {
  const { primary, accent, mode } = branding.colors;
  const dark = mode === "dark";
  const surfaceBg = dark ? "#0a0a0a" : "#fafafa";
  const surfaceCard = dark ? "#171717" : "#ffffff";
  const border = dark ? "#262626" : "#e5e5e5";
  const textStrong = dark ? "#fafafa" : "#171717";
  const textMuted = dark ? "#a3a3a3" : "#737373";
  const initial = branding.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-strong">Preview</span>
        <Badge tone="neutral">como lo ve tu cliente</Badge>
      </div>
      <div
        className="overflow-hidden rounded-card border"
        style={{ background: surfaceBg, borderColor: border }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ background: surfaceCard, borderColor: border }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: primary, color: contrastOn(primary) }}
          >
            {initial}
          </span>
          <span className="text-sm font-semibold" style={{ color: textStrong }}>
            {branding.name || "Tu comercio"}
          </span>
        </div>
        {/* Card de producto */}
        <div className="p-4">
          <div
            className="flex items-center justify-between rounded-lg border p-3"
            style={{ background: surfaceCard, borderColor: border }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: textStrong }}>
                Hamburguesa clásica
              </p>
              <p className="text-xs" style={{ color: textMuted }}>
                Carne, cheddar y lechuga
              </p>
            </div>
            <span className="text-sm font-bold" style={{ color: primary }}>
              $ 8.500
            </span>
          </div>
          <button
            className="mt-3 w-full rounded-lg py-2.5 text-sm font-semibold"
            style={{ background: primary, color: contrastOn(primary) }}
          >
            Ver pedido (1)
          </button>
          <p className="mt-2 text-center text-xs" style={{ color: accent }}>
            ● Muy pronto abrimos
          </p>
        </div>
      </div>
    </div>
  );
}
