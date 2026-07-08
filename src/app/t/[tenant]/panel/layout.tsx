import type { ReactNode } from "react";
import { getTenant } from "@/lib/tenants";
import { PanelShell } from "@/components/panel/PanelShell";

/**
 * Layout del panel: todas las páginas del dashboard pasan por el gate de
 * auth (PanelShell). El guard corre en el cliente; las Security Rules son
 * la cerradura real sobre los datos.
 */
export default async function PanelLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  const tenant = (await getTenant(tenantId))!; // el layout del tenant ya validó

  return (
    <PanelShell tenantId={tenantId} tenantName={tenant.branding.name}>
      {children}
    </PanelShell>
  );
}
