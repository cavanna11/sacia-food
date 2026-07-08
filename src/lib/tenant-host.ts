/**
 * Resolución de tenant a partir del hostname.
 *
 * Reglas:
 *  - `resto-a.localhost:3000`  -> tenant "resto-a"   (dev local)
 *  - `resto-a.midominio.com`   -> tenant "resto-a"   (prod, wildcard en Vercel)
 *  - `localhost:3000`, `midominio.com`, `www.midominio.com` -> sitio raíz (sin tenant)
 *  - `*.vercel.app`            -> sitio raíz (previews de Vercel no llevan tenant)
 *
 * El dominio raíz se configura con NEXT_PUBLIC_ROOT_DOMAIN (acepta varios,
 * separados por coma, ej: "localhost,midominio.com").
 */

/** Subdominios que nunca son un tenant. */
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin", "panel"]);

/** Formato válido de tenantId/subdominio: minúsculas, números y guiones. */
const TENANT_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function getRootDomains(): string[] {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isValidTenantId(id: string): boolean {
  return TENANT_ID_RE.test(id) && !RESERVED_SUBDOMAINS.has(id);
}

/**
 * Extrae el subdominio-tenant de un header Host.
 * Devuelve null si el host corresponde al sitio raíz (o no es un tenant válido).
 */
export function getTenantIdFromHost(
  host: string | null,
  rootDomains: string[] = getRootDomains(),
): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();

  // Los deploys de preview (*.vercel.app) sirven el sitio raíz.
  if (hostname.endsWith(".vercel.app")) return null;

  for (const root of rootDomains) {
    if (hostname === root) return null;
    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, -(root.length + 1));
      // Solo un nivel de subdominio y con formato válido.
      if (!sub.includes(".") && isValidTenantId(sub)) return sub;
      return null;
    }
  }
  return null;
}
