import { NextRequest, NextResponse } from "next/server";
import { getTenantIdFromHost } from "@/lib/tenant-host";

/**
 * Routing multi-tenant por subdominio.
 *
 * `resto-a.midominio.com/loquesea` se reescribe internamente a
 * `/t/resto-a/loquesea`. El visitante nunca ve `/t/...` en la URL.
 * El acceso directo por path a `/t/...` se bloquea (anti-spoofing):
 * el tenant lo determina SOLO el hostname.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;

  // Nadie entra a las rutas internas /t/* por path directo.
  if (url.pathname === "/t" || url.pathname.startsWith("/t/")) {
    return new NextResponse(null, { status: 404 });
  }

  const tenantId = getTenantIdFromHost(request.headers.get("host"));
  if (tenantId) {
    const rewritten = url.clone();
    rewritten.pathname = `/t/${tenantId}${url.pathname === "/" ? "" : url.pathname}`;
    const response = NextResponse.rewrite(rewritten);
    response.headers.set("x-tenant-id", tenantId);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos assets estáticos, imágenes optimizadas y archivos con extensión.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
