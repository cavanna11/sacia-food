import { describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";

const baseOrder = {
  items: [
    { productId: "a", name: "Burger Clásica", price: 8500, qty: 2 },
    { productId: "b", name: "Gaseosa", price: 2500, qty: 1 },
  ],
  itemsTotal: 19500,
  customer: { name: "Juana", phone: "11 4444-8888" },
  channel: "takeaway" as const,
};

describe("buildWhatsAppMessage", () => {
  it("lista los items con cantidad y subtotal", () => {
    const msg = buildWhatsAppMessage("Resto A", baseOrder);
    expect(msg).toContain("Resto A");
    expect(msg).toContain("2× Burger Clásica");
    expect(msg).toContain("1× Gaseosa");
    expect(msg).toContain("Retiro en el local");
    expect(msg).toContain("Juana");
  });

  it("suma el envío al total en delivery con zona", () => {
    const msg = buildWhatsAppMessage("Resto A", {
      ...baseOrder,
      channel: "delivery",
      address: "Calle 1 123",
      zoneName: "Centro",
      deliveryFee: 1500,
    });
    expect(msg).toContain("Envío a domicilio (Centro)");
    expect(msg).toContain("Calle 1 123");
    // total = 19500 + 1500 = 21000
    expect(msg).toContain("21.000");
  });

  it("incluye aclaraciones si las hay", () => {
    const msg = buildWhatsAppMessage("Resto A", { ...baseOrder, notes: "sin sal" });
    expect(msg).toContain("sin sal");
  });
});

describe("normalizeWhatsAppNumber", () => {
  it("deja solo dígitos", () => {
    expect(normalizeWhatsAppNumber("+54 9 2255 55-5555")).toBe("5492255555555");
  });
});

describe("buildWhatsAppUrl", () => {
  it("arma wa.me con el mensaje url-encoded", () => {
    const num = "54 9 2255 555555";
    const url = buildWhatsAppUrl(num, "hola mundo & cía");
    expect(url).toBe(
      `https://wa.me/${normalizeWhatsAppNumber(num)}?text=${encodeURIComponent("hola mundo & cía")}`,
    );
    expect(url).toContain("hola%20mundo");
    expect(url).not.toContain(" ");
  });
});
