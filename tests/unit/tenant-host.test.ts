import { describe, expect, it } from "vitest";
import { getTenantIdFromHost, isValidTenantId } from "@/lib/tenant-host";

const ROOTS = ["localhost", "midominio.com"];

describe("getTenantIdFromHost", () => {
  it("resuelve el subdominio como tenant en local y prod", () => {
    expect(getTenantIdFromHost("resto-a.localhost:3000", ROOTS)).toBe("resto-a");
    expect(getTenantIdFromHost("resto-a.midominio.com", ROOTS)).toBe("resto-a");
  });

  it("el dominio raíz y www no son tenants", () => {
    expect(getTenantIdFromHost("localhost:3000", ROOTS)).toBeNull();
    expect(getTenantIdFromHost("midominio.com", ROOTS)).toBeNull();
    expect(getTenantIdFromHost("www.midominio.com", ROOTS)).toBeNull();
  });

  it("subdominios reservados no son tenants", () => {
    for (const sub of ["app", "api", "admin", "panel"]) {
      expect(getTenantIdFromHost(`${sub}.midominio.com`, ROOTS)).toBeNull();
    }
  });

  it("los previews de Vercel sirven el sitio raíz", () => {
    expect(getTenantIdFromHost("mi-app-abc123.vercel.app", ROOTS)).toBeNull();
  });

  it("no acepta multinivel ni hosts ajenos", () => {
    expect(getTenantIdFromHost("a.b.midominio.com", ROOTS)).toBeNull();
    expect(getTenantIdFromHost("resto-a.otrodominio.com", ROOTS)).toBeNull();
    expect(getTenantIdFromHost(null, ROOTS)).toBeNull();
  });

  it("es case-insensitive", () => {
    expect(getTenantIdFromHost("RESTO-A.MiDominio.COM", ROOTS)).toBe("resto-a");
  });
});

describe("isValidTenantId", () => {
  it("acepta ids razonables y rechaza el resto", () => {
    expect(isValidTenantId("resto-a")).toBe(true);
    expect(isValidTenantId("a")).toBe(true);
    expect(isValidTenantId("-empieza-mal")).toBe(false);
    expect(isValidTenantId("termina-mal-")).toBe(false);
    expect(isValidTenantId("con espacios")).toBe(false);
    expect(isValidTenantId("www")).toBe(false);
  });
});
