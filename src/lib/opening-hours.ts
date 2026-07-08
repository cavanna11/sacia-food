import type { TenantConfig } from "@/lib/types";

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

export interface OpenState {
  open: boolean;
  /** Motivo cuando está cerrado. */
  reason?: "paused" | "outside_hours";
  /** Horario de hoy para mostrar ("HH:MM–HH:MM"), si está configurado. */
  hoursLabel?: string;
}

/** "HH:MM" → minutos desde medianoche. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * ¿La tienda acepta pedidos ahora?
 * - `acceptingOrders: false` gana siempre (pausa manual).
 * - Sin `hours` configuradas: abierta 24 hs.
 * - Ventanas que cruzan medianoche (ej. 20:00–02:00) soportadas.
 */
export function getOpenState(config: TenantConfig | undefined, now = new Date()): OpenState {
  if (config && config.acceptingOrders === false) {
    return { open: false, reason: "paused", hoursLabel: hoursLabel(config) };
  }
  const hours = config?.hours;
  if (!hours) return { open: true };

  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  if (open === null || close === null || open === close) return { open: true };

  const tz = config?.timezone ?? DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const current = toMinutes(parts) ?? 0;

  const isOpen =
    open < close
      ? current >= open && current < close
      : current >= open || current < close; // cruza medianoche

  return isOpen
    ? { open: true, hoursLabel: hoursLabel(config) }
    : { open: false, reason: "outside_hours", hoursLabel: hoursLabel(config) };
}

function hoursLabel(config?: TenantConfig): string | undefined {
  return config?.hours ? `${config.hours.open}–${config.hours.close}` : undefined;
}
