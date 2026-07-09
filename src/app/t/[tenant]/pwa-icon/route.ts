import { NextResponse } from "next/server";
import { contrastOn } from "@/lib/color";
import { getTenant } from "@/lib/tenants";

/** Ícono PWA generado con la marca del tenant (círculo + inicial). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantId } = await params;
  const tenant = await getTenant(tenantId);
  if (!tenant) return new NextResponse(null, { status: 404 });

  const { primary } = tenant.branding.colors;
  const initial = tenant.branding.name.charAt(0).toUpperCase();
  const fg = contrastOn(primary);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${primary}"/><text x="256" y="340" font-family="Arial, sans-serif" font-size="260" font-weight="bold" fill="${fg}" text-anchor="middle">${initial}</text></svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
