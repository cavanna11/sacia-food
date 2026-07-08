import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { contrastOn } from "@/lib/color";
import { isValidTenantId } from "@/lib/tenant-host";
import { getTenant } from "@/lib/tenants";

/**
 * Layout de todo lo que vive bajo un subdominio de tenant.
 * Acá ocurre la personalización visual: se lee `branding` del tenant y se
 * inyectan los design tokens (--tenant-*) como variables CSS. Ningún
 * componente de acá para abajo conoce colores: solo consume tokens.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantId } = await params;
  if (!isValidTenantId(tenantId)) notFound();

  const tenant = await getTenant(tenantId);
  if (!tenant || tenant.status === "suspended") notFound();

  const { colors } = tenant.branding;
  const tokens = {
    "--tenant-primary": colors.primary,
    "--tenant-on-primary": contrastOn(colors.primary),
    "--tenant-accent": colors.accent,
    "--tenant-on-accent": contrastOn(colors.accent),
  } as CSSProperties;

  return (
    <div
      data-mode={colors.mode}
      style={tokens}
      className="flex min-h-dvh flex-1 flex-col bg-bg text-strong"
    >
      {children}
    </div>
  );
}
