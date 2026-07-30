import Image from "next/image";
import type { CSSProperties } from "react";
import heroDemo from "@/assets/hero-demo.png";
import { IconBell, IconCheck } from "@/components/ui/icons";
import { Comparison } from "@/components/landing/Comparison";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { LandingEffects } from "@/components/landing/LandingEffects";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { SavingsCalculator } from "@/components/landing/SavingsCalculator";
import { Badge, Button, Card, CardDescription, CardTitle } from "@/components/ui";

/**
 * Sitio comercial (dominio raíz): hero, cómo funciona, funciones, demo en
 * vivo, comparación vs apps, calculadora de ahorro, planes, FAQ y CTA.
 * El navbar y el footer los pone el layout de (marketing).
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
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 lg:grid-cols-2 lg:pt-24">
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
            <a href="/alta">
              <Button className="!px-6 !py-3">Crear mi tienda</Button>
            </a>
            <a href="#demo">
              <Button variant="secondary" className="!px-6 !py-3">
                Ver la demo en vivo
              </Button>
            </a>
          </div>
          <p data-hero className="mt-4 text-sm text-muted">
            Sin tarjeta para empezar · Listo en minutos
          </p>
        </div>
        <div data-hero className="flex justify-center lg:justify-end">
          <div className="relative mx-auto w-full max-w-[400px]">
            <Image
              src={heroDemo}
              alt="La tienda de un comercio vista desde el celular del cliente"
              preload
              placeholder="blur"
              sizes="(max-width: 1024px) 80vw, 440px"
              className="h-auto w-full drop-shadow-2xl"
            />

            {/* Chip: pedido nuevo */}
            <div
              className="hero-chip absolute left-0 top-[13%] hidden -translate-x-4 md:block"
              style={{ animationDelay: "0.3s", "--float": "4.5s" } as CSSProperties}
            >
              <div className="floaty flex items-center gap-2.5 rounded-2xl border border-border-soft bg-card px-3.5 py-2.5 shadow-xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <IconBell size={16} />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold">Pedido nuevo 🛎</p>
                  <p className="text-[11px] text-muted">Retiro · $ 8.500</p>
                </div>
              </div>
            </div>

            {/* Chip: 0% comisión */}
            <div
              className="hero-chip absolute right-0 top-[40%] hidden translate-x-4 md:block"
              style={{ animationDelay: "0.5s", "--float": "5.5s" } as CSSProperties}
            >
              <div className="floaty rounded-2xl border border-border-soft bg-card px-4 py-2.5 text-center shadow-xl">
                <p className="text-2xl font-black leading-none text-primary">0%</p>
                <p className="text-[11px] font-medium text-muted">comisión</p>
              </div>
            </div>

            {/* Chip: cobrado */}
            <div
              className="hero-chip absolute bottom-[14%] left-0 hidden -translate-x-3 md:block"
              style={{ animationDelay: "0.7s", "--float": "6s" } as CSSProperties}
            >
              <div className="floaty flex items-center gap-2.5 rounded-2xl border border-border-soft bg-card px-3.5 py-2.5 shadow-xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <IconCheck size={16} />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold">Cobrado</p>
                  <p className="text-[11px] text-muted">MercadoPago · directo a vos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="scroll-mt-20 border-y border-border-soft bg-card py-20"
      >
        <div className="mx-auto max-w-5xl px-4">
          <h2 data-reveal className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Andando en 3 pasos
          </h2>
          <div data-reveal-group className="mt-12 grid gap-6 sm:grid-cols-3">
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

      {/* Funciones */}
      <Features />

      {/* Demo en vivo */}
      <section id="demo" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div data-reveal>
            <Badge tone="accent">Demo en vivo</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
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

      {/* Comparación vs apps */}
      <Comparison />

      {/* Calculadora */}
      <section id="ahorro" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-20">
        <div data-reveal>
          <SavingsCalculator />
        </div>
      </section>

      {/* Planes */}
      <section id="precios" className="scroll-mt-20 border-t border-border-soft bg-card py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 data-reveal className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Planes
          </h2>
          <p data-reveal className="mt-2 text-center text-muted">
            Arrancá chico y subí cuando crezcas. Sin permanencia.
          </p>
          <div data-reveal-group className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`flex flex-col ${plan.featured ? "border-2 border-primary shadow-md" : ""}`}
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

      {/* Preguntas */}
      <Faq />

      {/* CTA final */}
      <section className="px-4 py-20">
        <div
          data-reveal
          className="mx-auto max-w-4xl rounded-card bg-primary px-6 py-14 text-center text-on-primary"
        >
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Publicá tu tienda hoy
          </h2>
          <p className="mx-auto mt-3 max-w-lg opacity-90">
            En minutos tenés tu tienda con tu marca, lista para recibir pedidos
            sin comisiones. Sin tarjeta para empezar.
          </p>
          <a
            href="/alta"
            className="mt-8 inline-block rounded-control bg-on-primary px-7 py-3 font-semibold text-primary transition-transform hover:scale-105"
          >
            Crear mi tienda
          </a>
        </div>
      </section>
    </main>
  );
}
