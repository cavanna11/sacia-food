import { SimulatedCheckout } from "@/components/tenant/SimulatedCheckout";
import { TenantHeader } from "@/components/tenant/TenantHeader";
import { getTenant } from "@/lib/tenants";

/**
 * Checkout de pago SIMULADO (modo prueba, sin MercadoPago real).
 * Reemplaza al init_point de MP mientras el comercio no conectó su cuenta.
 */
export default async function PagoSimuladoPage({
  params,
}: {
  params: Promise<{ tenant: string; orderId: string }>;
}) {
  const { tenant: tenantId, orderId } = await params;
  const tenant = (await getTenant(tenantId))!;

  return (
    <>
      <TenantHeader branding={tenant.branding} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <SimulatedCheckout tenantId={tenantId} orderId={orderId} />
      </main>
    </>
  );
}
