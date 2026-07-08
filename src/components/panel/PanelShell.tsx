"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import type { TenantClaims } from "@/lib/types";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@/components/ui";

type GateState =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "wrong-tenant"; email: string }
  | { kind: "authorized"; user: User; claims: TenantClaims };

const NAV = [
  { href: "/panel", label: "Inicio" },
  { href: "/panel/pedidos", label: "Pedidos" },
  { href: "/panel/cocina", label: "Cocina" },
  { href: "/panel/catalogo", label: "Catálogo" },
  { href: "/panel/config", label: "Config" },
];

/**
 * Shell del panel: gate de auth + barra de navegación.
 * Exige sesión y que el custom claim `tenantId` coincida con el tenant del
 * subdominio. Un usuario de Resto A en el panel de Resto B ve "sin acceso" —
 * y aunque forzara el cliente, las Security Rules le niegan los datos.
 */
export function PanelShell({
  tenantId,
  tenantName,
  children,
}: {
  tenantId: string;
  tenantName: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const pathname = usePathname();

  useEffect(() => {
    return onAuthStateChanged(clientAuth, async (user) => {
      if (!user) {
        setState({ kind: "anonymous" });
        return;
      }
      const token = await user.getIdTokenResult();
      const claims = token.claims as TenantClaims;
      if (claims.tenantId === tenantId || claims.role === "superadmin") {
        setState({ kind: "authorized", user, claims });
      } else {
        setState({ kind: "wrong-tenant", email: user.email ?? "" });
      }
    });
  }, [tenantId]);

  if (state.kind === "loading") {
    return <CenteredNote>Cargando…</CenteredNote>;
  }

  if (state.kind === "anonymous") {
    return <LoginForm tenantName={tenantName} />;
  }

  if (state.kind === "wrong-tenant") {
    return (
      <CenteredNote>
        <p className="font-semibold">Sin acceso a este comercio</p>
        <p className="mt-1 text-sm text-muted">
          La cuenta {state.email} no pertenece a {tenantName}.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => signOut(clientAuth)}>
          Cerrar sesión
        </Button>
      </CenteredNote>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border-soft bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">{tenantName}</span>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-strong"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              {state.user.email} <Badge tone="accent">{state.claims.role}</Badge>
            </span>
            <Button variant="ghost" onClick={() => signOut(clientAuth)}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

function LoginForm({ tenantName }: { tenantName: string }) {
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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardTitle>Ingresar al panel</CardTitle>
        <CardDescription>{tenantName}</CardDescription>
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

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 text-center">
      <div>{children}</div>
    </main>
  );
}
