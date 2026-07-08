/** Lectura server-side de tenants (deduplicada por request con React cache). */
import "server-only";
import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import type { TenantDoc } from "@/lib/types";

export const getTenant = cache(async (tenantId: string): Promise<TenantDoc | null> => {
  const snap = await adminDb.doc(`tenants/${tenantId}`).get();
  if (!snap.exists) return null;
  return snap.data() as TenantDoc;
});
