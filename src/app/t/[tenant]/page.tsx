import { Cart } from "@/components/tenant/Cart";
import { CartProvider } from "@/components/tenant/CartProvider";
import { Menu } from "@/components/tenant/Menu";
import { TenantHeader } from "@/components/tenant/TenantHeader";
import { getTenant } from "@/lib/tenants";

/**
 * Storefront público del comercio: header con la marca, menú en tiempo real
 * y carrito con checkout en efectivo (MercadoPago llega en la entrega 3).
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
      <CartProvider tenantId={tenantId}>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24">
          <Menu tenantId={tenantId} />
        </main>
        <Cart tenantId={tenantId} />
      </CartProvider>
      <footer className="border-t border-border-soft py-4 text-center text-xs text-muted">
        {tenant.branding.name} · tienda propia sin comisiones
      </footer>
    </>
  );
}
