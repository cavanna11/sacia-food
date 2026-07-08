import { Menu } from "@/components/tenant/Menu";
import { TenantHeader } from "@/components/tenant/TenantHeader";
import { getTenant } from "@/lib/tenants";

/**
 * Storefront público del comercio: header con la marca + menú en tiempo real.
 * El carrito y el checkout llegan en la próxima entrega de la Fase 1.
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <Menu tenantId={tenantId} />
      </main>
      <footer className="border-t border-border-soft py-4 text-center text-xs text-muted">
        {tenant.branding.name} · tienda propia sin comisiones
      </footer>
    </>
  );
}
