"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { clientAuth, clientDb } from "@/lib/firebase/client";
import type { TenantClaims, TenantDoc } from "@/lib/types";
import { BRAND } from "@/lib/brand";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@/components/ui";

type Tenant = TenantDoc & { id: string };

type Gate =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "forbidden"; email: string }
  | { kind: "ok"; user: User };

/**
 * Panel superadmin de la plataforma: listar todos los comercios, ver su
 * estado y plan, y suspender/activar. El acceso lo controla el custom claim
 * `role: superadmin`; las Security Rules son la cerradura real (solo el
 * superadmin puede listar tenants y cambiar su `status`).
 */
export function SuperadminPanel() {
  const [gate, setGate] = useState<Gate>({ kind: "loading" });

  useEffect(() => {
    return onAuthStateChanged(clientAuth, async (user) => {
      if (!user) return setGate({ kind: "anonymous" });
      const token = await user.getIdTokenResult();
      const claims = token.claims as TenantClaims;
      setGate(
        claims.role === "superadmin"
          ? { kind: "ok", user }
          : { kind: "forbidden", email: user.email ?? "" },
      );
    });
  }, []);

  if (gate.kind === "loading") {
    return <Centered>Cargando…</Centered>;
  }
  if (gate.kind === "anonymous") {
    return <LoginForm />;
  }
  if (gate.kind === "forbidden") {
    return (
      <Centered>
        <p className="font-semibold">Sin acceso</p>
        <p className="mt-1 text-sm text-muted">
          La cuenta {gate.email} no es de superadmin.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => signOut(clientAuth)}>
          Cerrar sesión
        </Button>
      </Centered>
    );
  }

  return <Dashboard email={gate.user.email ?? ""} />;
}

function Dashboard({ email }: { email: string }) {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(clientDb, "tenants"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => setTenants(snap.docs.map((d) => ({ id: d.id, ...(d.data() as TenantDoc) }))),
      (err) => setError(err.message),
    );
  }, []);

  const stats = useMemo(() => {
    const list = tenants ?? [];
    return {
      total: list.length,
      active: list.filter((t) => t.status === "active").length,
      trial: list.filter((t) => t.status === "trial").length,
      suspended: list.filter((t) => t.status === "suspended").length,
    };
  }, [tenants]);

  const rootHost = typeof window !== "undefined" ? window.location.host : "";
  const proto = typeof window !== "undefined" ? window.location.protocol : "http:";
  const storeUrl = (id: string) => `${proto}//${id}.${rootHost}`;

  async function toggleStatus(t: Tenant) {
    const next = t.status === "suspended" ? "active" : "suspended";
    if (next === "suspended" && !confirm(`¿Suspender "${t.branding.name}"? Su tienda deja de recibir pedidos.`))
      return;
    try {
      await updateDoc(doc(clientDb, `tenants/${t.id}`), { status: next });
    } catch {
      setError("No se pudo cambiar el estado.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border-soft bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <span className="font-black tracking-tight">{BRAND.name}</span>
            <Badge tone="accent" className="ml-2">
              superadmin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{email}</span>
            <Button variant="ghost" onClick={() => signOut(clientAuth)}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Comercios</h1>

        {/* Métricas globales */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat label="Total" value={stats.total} />
          <Stat label="Activos" value={stats.active} />
          <Stat label="En prueba" value={stats.trial} />
          <Stat label="Suspendidos" value={stats.suspended} />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Lista de comercios */}
        {tenants === null ? (
          <p className="mt-8 text-muted">Cargando comercios…</p>
        ) : tenants.length === 0 ? (
          <Card className="mt-8 text-center">
            <p className="font-semibold">Todavía no hay comercios</p>
            <p className="mt-1 text-sm text-muted">
              Cuando alguien se dé de alta, aparece acá.
            </p>
          </Card>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {tenants.map((t) => (
              <Card key={t.id} className="flex flex-wrap items-center gap-4 !p-4">
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.branding.name}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {t.id}.{rootHost} · plan {t.plan}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={storeUrl(t.id)} target="_blank" rel="noreferrer">
                    <Button variant="ghost" className="!py-2 text-xs">
                      Ver tienda
                    </Button>
                  </a>
                  <a href={`${storeUrl(t.id)}/panel`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" className="!py-2 text-xs">
                      Panel
                    </Button>
                  </a>
                  <Button
                    variant={t.status === "suspended" ? "primary" : "danger"}
                    className="!py-2 text-xs"
                    onClick={() => toggleStatus(t)}
                  >
                    {t.status === "suspended" ? "Activar" : "Suspender"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: TenantDoc["status"] }) {
  if (status === "active") return <Badge tone="primary">Activo</Badge>;
  if (status === "trial") return <Badge tone="accent">Prueba</Badge>;
  return <Badge tone="neutral">Suspendido</Badge>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="!p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
    </Card>
  );
}

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(
        clientAuth,
        String(form.get("email")),
        String(form.get("password")),
      );
    } catch {
      setError("Email o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardTitle>Superadmin</CardTitle>
        <CardDescription>{BRAND.name} · acceso interno</CardDescription>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input label="Email" name="email" type="email" required autoComplete="email" />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-center">
      <div>{children}</div>
    </main>
  );
}
