import { IconChat, IconInstagram, IconMail, IconUtensils } from "@/components/ui/icons";
import { BRAND } from "@/lib/brand";

const COLUMNS = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Funciones", href: "#funciones" },
      { label: "Precios", href: "#precios" },
      { label: "Ver demo", href: "http://resto-a.localhost:3000" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Preguntas frecuentes", href: "#preguntas" },
      { label: "Crear mi tienda", href: "/alta" },
      { label: "Calculadora de ahorro", href: "#ahorro" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos y condiciones", href: "#" },
      { label: "Política de privacidad", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border-soft bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Marca */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 font-black tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
                <IconUtensils size={18} />
              </span>
              <span className="text-lg">{BRAND.name}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted">{BRAND.tagline}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={BRAND.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-soft text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <IconInstagram size={18} />
              </a>
              <a
                href={BRAND.whatsapp}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-soft text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <IconChat size={18} />
              </a>
              <a
                href={`mailto:${BRAND.email}`}
                aria-label="Email"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border-soft text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <IconMail size={18} />
              </a>
            </div>
          </div>

          {/* Columnas de links */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-strong">{col.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border-soft pt-6 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. Hecho en {BRAND.location} 🌊
          </p>
          <p>Tu comercio, tu marca, tus datos.</p>
        </div>
      </div>
    </footer>
  );
}
