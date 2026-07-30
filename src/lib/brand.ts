/**
 * Identidad de la plataforma (el SaaS, no los comercios).
 *
 * TODO: reemplazar por el nombre/dominio definitivos. Todo lo visible en la
 * landing sale de acá, así que cambiar la marca es tocar SOLO este archivo.
 */
export const BRAND = {
  name: "Comandá",
  /** Claim corto. */
  tagline: "Tu tienda de pedidos, sin comisiones.",
  /** Dominio (placeholder hasta comprarlo). */
  domain: "comanda.com.ar",
  email: "hola@comanda.com.ar",
  /** Redes (placeholder). */
  instagram: "https://instagram.com/",
  whatsapp: "https://wa.me/",
  /** Ciudad/origen para el footer. */
  location: "Partido de La Costa, Buenos Aires",
} as const;
