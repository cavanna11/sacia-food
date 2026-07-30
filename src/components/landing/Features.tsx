import {
  IconCard,
  IconChart,
  IconChefHat,
  IconShield,
  IconStore,
  IconTruck,
} from "@/components/ui/icons";
import { Card } from "@/components/ui";

const FEATURES = [
  {
    icon: IconStore,
    title: "Pedidos en vivo",
    text: "Recibí los pedidos en tiempo real en una cola clara: aceptar, preparar, listo, entregado.",
  },
  {
    icon: IconChefHat,
    title: "Pantalla de cocina",
    text: "Un KDS con timers y colores por antigüedad. Reemplaza la comanda de papel.",
  },
  {
    icon: IconCard,
    title: "Todos los medios de pago",
    text: "MercadoPago, transferencia y efectivo. La plata entra directo a tu cuenta.",
  },
  {
    icon: IconTruck,
    title: "Delivery por zonas",
    text: "Definí tus zonas y el costo de envío. Retiro, envío y salón, todo a la misma cocina.",
  },
  {
    icon: IconShield,
    title: "Anti-pedidos falsos",
    text: "Confirmación previa, límites por teléfono y lista negra. Menos cargadas, menos pérdidas.",
  },
  {
    icon: IconChart,
    title: "Estadísticas en vivo",
    text: "Ventas del día, ticket promedio y tus productos más vendidos, sin esperar al cierre.",
  },
];

export function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 border-t border-border-soft bg-card py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que tu tienda necesita
          </h2>
          <p className="mt-3 text-muted">
            Una plataforma completa para vender online con tu marca, sin depender
            de las apps de delivery.
          </p>
        </div>

        <div
          data-reveal-group
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <Card key={f.title} className="h-full">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
