/** Utilidades de color para los design tokens por tenant. */

/**
 * Devuelve el color de texto (claro u oscuro) que mejor contrasta
 * sobre un fondo hex dado (luminancia YIQ). Guardarraíl de legibilidad:
 * el texto sobre el color de marca siempre se lee, elija lo que elija el cliente.
 */
export function contrastOn(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.padEnd(6, "0");
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#171717" : "#ffffff";
}
