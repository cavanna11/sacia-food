import { formatARS } from "@/lib/format";
import type { CartItem } from "@/components/tenant/CartProvider";

export interface WhatsAppOrder {
  items: CartItem[];
  itemsTotal: number;
  customer: { name: string; phone: string };
  channel: "takeaway" | "delivery";
  address?: string;
  zoneName?: string;
  deliveryFee?: number;
  notes?: string;
}

/**
 * Arma el texto del pedido para enviar por WhatsApp al comercio (Plan
 * Presencia). El mensaje es legible para que el dueño lo lea de un vistazo.
 */
export function buildWhatsAppMessage(tenantName: string, order: WhatsAppOrder): string {
  const lines: string[] = [];
  lines.push(`*Nuevo pedido — ${tenantName}*`);
  lines.push("");
  for (const it of order.items) {
    lines.push(`• ${it.qty}× ${it.name} — ${formatARS(it.price * it.qty)}`);
  }
  lines.push("");
  lines.push(
    order.channel === "delivery"
      ? `Entrega: Envío a domicilio${order.zoneName ? ` (${order.zoneName})` : ""}`
      : "Entrega: Retiro en el local",
  );
  if (order.address) lines.push(`Dirección: ${order.address}`);
  if ((order.deliveryFee ?? 0) > 0) {
    lines.push(`Envío: ${formatARS(order.deliveryFee!)}`);
  }
  if (order.notes) lines.push(`Aclaraciones: ${order.notes}`);
  lines.push("");
  const total = order.itemsTotal + (order.deliveryFee ?? 0);
  lines.push(`*Total: ${formatARS(total)}*`);
  lines.push("");
  lines.push(`Cliente: ${order.customer.name} — ${order.customer.phone}`);
  return lines.join("\n");
}

/** Deja solo dígitos del teléfono del comercio (formato que espera wa.me). */
export function normalizeWhatsAppNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** URL de wa.me con el mensaje pre-cargado. */
export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(number)}?text=${encodeURIComponent(message)}`;
}
