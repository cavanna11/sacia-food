"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { clientFunctions } from "@/lib/firebase/client";
import { isValidTenantId } from "@/lib/tenant-host";
import { Button, Card, CardTitle, Input } from "@/components/ui";

/** Deriva un subdominio válido a partir del nombre del comercio. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sin tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function SignupForm() {
  const params = useSearchParams();
  const initialPlan = params.get("plan") ?? "gestion";

  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Host raíz actual (localhost:3000 en dev, midominio.com en prod).
  const rootHost = typeof window !== "undefined" ? window.location.host : "";

  if (done) {
    const base = `${window.location.protocol}//${done}.${rootHost}`;
    return (
      <Card className="text-center">
        <p className="text-4xl">🎉</p>
        <CardTitle className="mt-3 text-xl">¡Tu tienda está lista!</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Entrá al panel con el email y la contraseña que elegiste y cargá tu
          menú. Tu tienda ya está publicada en:
        </p>
        <p className="mt-2 break-all font-mono text-sm font-semibold text-primary">
          {done}.{rootHost}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a href={`${base}/panel`}>
            <Button className="w-full">Ir a mi panel</Button>
          </a>
          <a href={base}>
            <Button variant="secondary" className="w-full">
              Ver mi tienda
            </Button>
          </a>
        </div>
      </Card>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const sub = subdomain.trim().toLowerCase();
    if (!isValidTenantId(sub)) {
      setError("El subdominio solo puede tener minúsculas, números y guiones.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const call = httpsCallable<
        {
          subdomain: string;
          businessName: string;
          email: string;
          password: string;
          plan: string;
        },
        { tenantId: string }
      >(clientFunctions, "provisionTenant");
      const { data } = await call({
        subdomain: sub,
        businessName: String(form.get("businessName")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        plan: String(form.get("plan")),
      });
      setDone(data.tenantId);
    } catch (err) {
      setError(
        err instanceof Error && err.message && err.message !== "internal"
          ? err.message
          : "No pudimos crear la tienda. Probá de nuevo.",
      );
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre de tu comercio"
          name="businessName"
          required
          minLength={2}
          placeholder="Ej: Lo de Santi"
          onChange={(e) => {
            if (!subdomainTouched) setSubdomain(slugify(e.target.value));
          }}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="subdomain" className="text-sm font-medium text-strong">
            Dirección de tu tienda
          </label>
          <div className="flex items-center gap-1">
            <input
              id="subdomain"
              required
              value={subdomain}
              onChange={(e) => {
                setSubdomainTouched(true);
                setSubdomain(slugify(e.target.value));
              }}
              className="min-w-0 flex-1 rounded-control border border-border-soft bg-card px-3.5 py-2.5 text-sm text-strong focus:border-primary focus:outline-none"
              placeholder="lo-de-santi"
            />
            <span className="shrink-0 text-sm text-muted">.{rootHost}</span>
          </div>
        </div>
        <Input label="Tu email" name="email" type="email" required autoComplete="email" />
        <Input
          label="Contraseña (mínimo 8 caracteres)"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan" className="text-sm font-medium text-strong">
            Plan
          </label>
          <select
            id="plan"
            name="plan"
            defaultValue={initialPlan}
            className="rounded-control border border-border-soft bg-card px-3.5 py-2.5 text-sm text-strong focus:border-primary focus:outline-none"
          >
            <option value="presencia">Presencia</option>
            <option value="gestion">Gestión</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Creando tu tienda…" : "Crear mi tienda"}
        </Button>
        <p className="text-center text-xs text-muted">
          Sin tarjeta para empezar: arrancás en modo prueba y activás el plan
          cuando quieras.
        </p>
      </form>
    </Card>
  );
}
