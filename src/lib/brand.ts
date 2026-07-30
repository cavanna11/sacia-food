/**
 * Identidad de la plataforma (el SaaS, no los comercios).
 *
 * TODO: reemplazar por el nombre/dominio definitivos. Todo lo visible en la
 * landing sale de acá, así que cambiar la marca es tocar SOLO este archivo.
 */
export const BRAND = {
  // Variantes válidas del nombre: "Sacia Food" | "SACIA Food" | "Sacia-Food".
  name: "Sacia Food",
  /** Claim corto. */
  tagline: "Tu tienda de pedidos, sin comisiones.",
  /** Dominio. */
  domain: "saciafood.com",
  email: "hola@saciafood.com",
  /** Redes (placeholder). */
  instagram: "https://instagram.com/",
  whatsapp: "https://wa.me/",
  /** Ciudad/origen para el footer. */
  location: "Partido de La Costa, Buenos Aires",
} as const;
