import { IconCheck, IconX } from "@/components/ui/icons";
import { BRAND } from "@/lib/brand";

const ROWS: { label: string; own: boolean; apps: boolean }[] = [
  { label: "Sin comisión por pedido", own: true, apps: false },
  { label: "Tu marca, tu tienda", own: true, apps: false },
  { label: "Los clientes son tuyos", own: true, apps: false },
  { label: "Tus datos y ventas, tuyos", own: true, apps: false },
  { label: "Tu propio dominio", own: true, apps: false },
  { label: "Abono mensual fijo y previsible", own: true, apps: false },
];

export function Comparison() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tu tienda vs. las apps de delivery
          </h2>
          <p className="mt-3 text-muted">
            Las apps se llevan hasta el 30% de cada venta y se quedan con tus
            clientes. Con tu propia tienda, todo eso queda de tu lado.
          </p>
        </div>

        <div
          data-reveal
          className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-card border border-border-soft"
        >
          <div className="grid grid-cols-[1fr_auto_auto]">
            {/* Encabezado */}
            <div className="bg-card p-4" />
            <div className="bg-primary p-4 text-center text-sm font-bold text-on-primary">
              {BRAND.name}
            </div>
            <div className="bg-card p-4 text-center text-sm font-semibold text-muted">
              Apps de delivery
            </div>

            {ROWS.map((row, i) => (
              <div key={row.label} className="contents">
                <div
                  className={`flex items-center p-4 text-sm ${
                    i % 2 ? "bg-card" : "bg-bg"
                  }`}
                >
                  {row.label}
                </div>
                <div
                  className={`flex items-center justify-center p-4 ${
                    i % 2 ? "bg-primary/10" : "bg-primary/5"
                  }`}
                >
                  <IconCheck className="text-primary" size={20} />
                </div>
                <div
                  className={`flex items-center justify-center p-4 ${
                    i % 2 ? "bg-card" : "bg-bg"
                  }`}
                >
                  <IconX className="text-muted" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
