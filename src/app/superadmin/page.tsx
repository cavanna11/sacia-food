import type { Metadata } from "next";
import { SuperadminPanel } from "@/components/superadmin/SuperadminPanel";

export const metadata: Metadata = {
  title: "Superadmin · Sacia Food",
  robots: { index: false, follow: false },
};

/** Panel interno de la plataforma (solo superadmin). */
export default function SuperadminPage() {
  return <SuperadminPanel />;
}
