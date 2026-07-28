import Image from "next/image";
import heroDemo from "@/assets/hero-demo.png";
import { LandingEffects } from "@/components/landing/LandingEffects";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { SavingsCalculator } from "@/components/landing/SavingsCalculator";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui";

/**
 * Landing comercial (dominio raíz). Versión 1 de la Fase 2: hero,
 * calculadora de ahorro, planes y demo. El motion con GSAP y el alta
 * self-service llegan en las próximas entregas.
 */

const PLANS = [
  {
    id: "presencia",
    name: "Presencia",
    price: "Desde $ 18.000/mes",
    tagline: "Tu menú digital profesional, hoy.",
    features: [
      "Tienda con tu marca (logo, colores, fotos)",
      "Catálogo con categorías y fotos",
      "Pedido directo por WhatsApp",
      "Subdominio propio + PWA instalable",
    ],
    featured: false,
  },
  {
    id: "gestion",
    name: "Gestión",
    price: "Desde $ 45.000/mes",
    tagline: "Dejá de perder plata en comisiones.",
    features: [
      "Todo lo de Presencia",
      "Pedidos online en tiempo real + vista cocina",
      "Todos los medios de pago de Argentina",
      "Delivery por zonas, retiro y salón",
      "Estadísticas en vivo y anti-pedidos falsos",
    ],
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "Desde $ 90.000/mes",
    tagline: "Operá como una cadena moderna.",
    features: [
      "Todo lo de Gestión",
      "Tracking GPS del delivery en vivo",
      "Fidelización con puntos y cupones",
      "Analítica avanzada y multi-sucursal",
      "Sugerencias con IA en el checkout",
    ],
    featured: false,
  },
];

const STEPS = [
  {
    title: "Creá tu tienda",
    text: "Logo, colores y menú en minutos. Queda en tu propio subdominio, con tu marca.",
  },
  {
    title: "Recibí pedidos",
    text: "Tus clientes piden desde el celu sin apps ni cuentas. Vos los ves llegar en vivo.",
  },
  {
    title: "Cobrá sin comisiones",
    text: "MercadoPago, transferencia o efectivo. La plata va directo a tu cuenta.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 overflow-x-clip">
      <LandingEffects />
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-20 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <div data-hero>
            <Badge tone="primary">Sin comisión por pedido</Badge>
          </div>
          <h1
            data-hero
            className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-6xl"
          >
            Tu tienda de pedidos online, <span className="text-primary">con tu marca</span>
          </h1>
          <p data-hero className="mx-auto mt-5 max-w-xl text-lg text-muted lg:mx-0">
            Las apps de delivery se llevan hasta el 30% de cada venta. Con tu
            propia tienda pagás un abono fijo: tus clientes, tus datos y tu
            plata quedan con vos.
          </p>
          <div data-hero className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <a href="#planes">
              <Button className="!px-6 !py-3">Ver planes</Button>
            </a>
            <a href="http://resto-a.localhost:3000" target="_blank">
              <Button variant="secondary" className="!px-6 !py-3">
                Probar la demo en vivo
              </Button>
            </a>
          </div>
        </div>
        <div data-hero className="flex justify-center lg:justify-end">
          <Image
            src={heroDemo}
            alt="La tienda de un comercio vista desde el celular del cliente"
            preload
            placeholder="blur"
            sizes="(max-width: 1024px) 80vw, 440px"
            className="h-auto w-full max-w-[400px] drop-shadow-2xl"
          />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-y border-border-soft bg-card py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 data-reveal className="text-center text-3xl font-bold tracking-tight">
            Andando en 3 pasos
          </h2>
          <div data-reveal-group className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-black text-on-primary">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo en vivo */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div data-reveal>
            <Badge tone="accent">Demo en vivo</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Probala antes de comprar
            </h2>
            <p className="mt-3 text-muted">
              Esta es una tienda real corriendo sobre la plataforma. Agregá
              productos, abrí el carrito y hacé un pedido de prueba — así lo va
              a ver tu cliente desde el celular, sin instalar ninguna app.
            </p>
            <ul className="mt-5 flex flex-col gap-2 text-sm">
              <li className="flex gap-2">
                <span className="text-primary">✓</span> Menú y carrito en tiempo real
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span> Checkout de un toque, sin cuenta
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span> Con la marca del comercio
              </li>
            </ul>
          </div>
          <div data-reveal>
            <LiveDemo />
          </div>
        </div>
      </section>

      {/* Calculadora */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div data-reveal>
          <SavingsCalculator />
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="border-t border-border-soft bg-card py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 data-reveal className="text-center text-3xl font-bold tracking-tight">Planes</h2>
          <p data-reveal className="mt-2 text-center text-muted">
            Arrancá chico y subí cuando crezcas. Sin permanencia.
          </p>
          <div data-reveal-group className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`flex flex-col ${plan.featured ? "border-2 border-primary" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.featured && <Badge tone="primary">Más elegido</Badge>}
                </div>
                <p className="mt-1 text-2xl font-black">{plan.price}</p>
                <CardDescription>{plan.tagline}</CardDescription>
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={`/alta?plan=${plan.id}`} className="mt-6">
                  <Button
                    variant={plan.featured ? "primary" : "secondary"}
                    className="w-full"
                  >
                    Quiero este plan
                  </Button>
                </a>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted">
            Precios de referencia. Arrancás en modo prueba sin tarjeta y
            activás el plan cuando quieras.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm text-muted">
        <p>Hecho en la Costa Atlántica 🌊 · Tu comercio, tu marca, tus datos.</p>
        <p className="mt-2 text-xs">
          Demos: <a className="underline" href="http://resto-a.localhost:3000">Resto A</a> ·{" "}
          <a className="underline" href="http://resto-b.localhost:3000">Resto B</a>
        </p>
      </footer>
    </main>
  );
}
