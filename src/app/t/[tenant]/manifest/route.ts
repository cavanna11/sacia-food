import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenants";

/**
 * Manifest PWA dinámico por tenant: cada tienda se instala con SU nombre,
 * color e ícono. Ruta sin punto a propósito: el matcher del proxy excluye
 * paths con extensión, y esta ruta debe pasar por el rewrite de subdominio.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantId } = await params;
  const tenant = await getTenant(tenantId);
  if (!tenant) return new NextResponse(null, { status: 404 });

  const { branding } = tenant;
  const dark = branding.colors.mode === "dark";

  return NextResponse.json(
    {
      name: branding.name,
      short_name: branding.name.slice(0, 12),
      description: `Pedí online en ${branding.name}`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: dark ? "#0a0a0a" : "#fafafa",
      theme_color: branding.colors.primary,
      icons: [
        {
          src: "/pwa-icon",
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any",
        },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
