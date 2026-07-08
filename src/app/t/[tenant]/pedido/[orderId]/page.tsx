import { OrderTracker } from "@/components/tenant/OrderTracker";
import { TenantHeader } from "@/components/tenant/TenantHeader";
import { getTenant } from "@/lib/tenants";

/** Seguimiento público del pedido (sin cuenta): el ID es el token. */
export default async function PedidoPage({
  params,
}: {
  params: Promise<{ tenant: string; orderId: string }>;
}) {
  const { tenant: tenantId, orderId } = await params;
  const tenant = (await getTenant(tenantId))!;

  return (
    <>
      <TenantHeader branding={tenant.branding} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <OrderTracker tenantId={tenantId} orderId={orderId} />
      </main>
    </>
  );
}
