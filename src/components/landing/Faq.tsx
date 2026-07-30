"use client";

import { useState } from "react";
import { IconChevronDown } from "@/components/ui/icons";

const QA = [
  {
    q: "¿Necesito tarjeta para empezar?",
    a: "No. Creás tu tienda gratis en modo prueba, cargás tu menú y la publicás. Activás el plan pago cuando quieras.",
  },
  {
    q: "¿Cómo cobro los pedidos?",
    a: "Con MercadoPago (la plata entra en tu propia cuenta), transferencia o efectivo. También podés recibir los pedidos directo por WhatsApp si arrancás con el plan más simple.",
  },
  {
    q: "¿De verdad no me cobran comisión por pedido?",
    a: "Correcto. Pagás un abono mensual fijo, no un porcentaje de tus ventas. Vendas 10 o 1000 pedidos, el abono es el mismo.",
  },
  {
    q: "¿Puedo usar mi propio dominio?",
    a: "Sí. Arrancás con un subdominio tuyo (tunombre.nuestrodominio) y podés sumar tu dominio propio como add-on.",
  },
  {
    q: "¿Sirve para mi rubro?",
    a: "Está pensado para gastronomía: hamburgueserías, pizzerías, cafés, rotiserías, heladerías y más. Delivery, retiro y salón, todo en el mismo lugar.",
  },
  {
    q: "¿Los clientes y sus datos son míos?",
    a: "Siempre. A diferencia de las apps de delivery, tus clientes, sus pedidos y tus estadísticas quedan de tu lado.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="preguntas" className="scroll-mt-20 border-t border-border-soft bg-card py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2
          data-reveal
          className="text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Preguntas frecuentes
        </h2>

        <div data-reveal className="mt-10 flex flex-col gap-3">
          {QA.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-card border border-border-soft bg-bg"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold">{item.q}</span>
                  <IconChevronDown
                    size={20}
                    className={`shrink-0 text-muted transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-muted">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
