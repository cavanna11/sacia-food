import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui";

/** Inicio del panel. Las métricas en vivo llegan con los pedidos (Fase 1). */
export default function PanelHomePage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/panel/catalogo">
          <Card className="h-full transition-colors hover:border-primary">
            <CardTitle>Catálogo</CardTitle>
            <CardDescription>
              Cargá tus productos, precios y disponibilidad.
            </CardDescription>
          </Card>
        </Link>
        <Card>
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>La cola de pedidos en vivo llega en la próxima entrega.</CardDescription>
        </Card>
        <Card>
          <CardTitle>Cobros</CardTitle>
          <CardDescription>MercadoPago y efectivo, próximamente.</CardDescription>
        </Card>
      </div>
    </>
  );
}
