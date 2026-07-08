import { TenantHeader } from "@/components/tenant/TenantHeader";
import { Badge } from "@/components/ui";
import { getTenant } from "@/lib/tenants";

/**
 * Storefront público del comercio. En Fase 0 es deliberadamente vacío:
 * header con la marca del tenant y un estado "próximamente".
 * El catálogo y el carrito llegan en Fase 1.
 */
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  const tenant = (await getTenant(tenantId))!; // el layout ya validó existencia

  return (
    <>
      <TenantHeader branding={tenant.branding} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <Badge tone="primary">Muy pronto</Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          {tenant.branding.name}
        </h1>
        <p className="max-w-md text-muted">
          Estamos preparando la tienda online. Acá vas a poder ver el menú y
          hacer tu pedido en segundos.
        </p>
      </main>
      <footer className="border-t border-border-soft py-4 text-center text-xs text-muted">
        {tenant.branding.name} · tienda propia sin comisiones
      </footer>
    </>
  );
}
