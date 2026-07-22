/**
 * Paletas de marca curadas por la plataforma.
 *
 * El cliente elige DENTRO de este set (guardarraíl del spec: "libertad de
 * marca, no libertad de romper el diseño"). Cada `primary` está elegido para
 * dar buen contraste con texto blanco (WCAG AA para texto grande / botones),
 * de modo que el storefront siempre se lea bien. El acento se usa en detalles.
 */
export interface BrandPalette {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export const BRAND_PALETTES: BrandPalette[] = [
  { id: "rojo", name: "Rojo brasa", primary: "#e11d48", accent: "#f59e0b" },
  { id: "naranja", name: "Naranja fuego", primary: "#ea580c", accent: "#0ea5e9" },
  { id: "verde", name: "Verde albahaca", primary: "#059669", accent: "#84cc16" },
  { id: "azul", name: "Azul profundo", primary: "#2563eb", accent: "#f43f5e" },
  { id: "violeta", name: "Violeta uva", primary: "#7c3aed", accent: "#f59e0b" },
  { id: "rosa", name: "Rosa frutal", primary: "#db2777", accent: "#0ea5e9" },
  { id: "teal", name: "Verde mar", primary: "#0d9488", accent: "#f59e0b" },
  { id: "grafito", name: "Grafito", primary: "#334155", accent: "#f97316" },
];

/** Devuelve la paleta cuyo primary coincide, o null. */
export function findPaletteByPrimary(primary: string): BrandPalette | null {
  const p = primary.toLowerCase();
  return BRAND_PALETTES.find((pal) => pal.primary.toLowerCase() === p) ?? null;
}
