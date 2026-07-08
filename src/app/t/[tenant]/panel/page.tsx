import { getTenant } from "@/lib/tenants";
import { PanelGate } from "@/components/panel/PanelGate";

/**
 * Dashboard del comerciante (vacío en Fase 0).
 * El guard de auth corre en el cliente; las Security Rules son la cerradura
 * real: aunque alguien saltee el guard, no puede leer datos de otro tenant.
 */
export default async function PanelPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  const tenant = (await getTenant(tenantId))!;

  return <PanelGate tenantId={tenantId} tenantName={tenant.branding.name} />;
}
