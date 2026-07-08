import type { TenantBranding } from "@/lib/types";

/** Header público del storefront: logo (o inicial como fallback) + nombre. */
export function TenantHeader({ branding }: { branding: TenantBranding }) {
  return (
    <header className="border-b border-border-soft bg-card">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
        {branding.logoUrl ? (
          // Los logos pueden ser data URIs o venir de Storage: <img> plano a propósito.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoUrl}
            alt={`Logo de ${branding.name}`}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-on-primary"
          >
            {branding.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-lg font-semibold tracking-tight">{branding.name}</span>
      </div>
    </header>
  );
}
