/** Tipos base del dominio multi-tenant (Fase 0: solo esqueleto). */

export type TenantPlan = "presencia" | "gestion" | "pro";
export type TenantStatus = "active" | "suspended" | "trial";

/** Roles dentro de un tenant. `superadmin` es de plataforma (nosotros). */
export type UserRole = "owner" | "staff" | "kitchen" | "rider" | "superadmin";

export interface TenantBranding {
  /** Nombre visible del comercio. */
  name: string;
  /** Logo (URL o data URI). Opcional: hay fallback con inicial. */
  logoUrl?: string;
  coverUrl?: string;
  colors: {
    /** Color de marca principal (hex). */
    primary: string;
    /** Color de acento (hex). */
    accent: string;
    /** Modo base del storefront. */
    mode: "light" | "dark";
  };
  /** Clave de tipografía dentro del set curado (Fase 0: solo "sans"). */
  font?: string;
}

export interface TenantDoc {
  subdomain: string;
  plan: TenantPlan;
  status: TenantStatus;
  branding: TenantBranding;
  createdAt: number;
}

/** Custom claims que viajan en el token de Firebase Auth. */
export interface TenantClaims {
  tenantId?: string;
  role?: UserRole;
}
