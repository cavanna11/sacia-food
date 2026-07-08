"use client";

import { useEffect, useState, type FormEvent } from "react";
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

/**
 * Guard del panel: exige sesión y que el custom claim `tenantId` del token
 * coincida con el tenant del subdominio. Un usuario de Resto A logueado en
 * el panel de Resto B ve "sin acceso" — y aunque forzara el cliente, las
 * Security Rules le niegan los datos.
 */
export function PanelGate({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const [state, setState] = useState<GateState>({ kind: "loading" });

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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel · {tenantName}</h1>
          <p className="mt-1 text-sm text-muted">
            {state.user.email} <Badge tone="accent">{state.claims.role}</Badge>
          </p>
        </div>
        <Button variant="ghost" onClick={() => signOut(clientAuth)}>
          Salir
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>La cola de pedidos en vivo llega en Fase 1.</CardDescription>
        </Card>
        <Card>
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>Alta de productos y precios, en Fase 1.</CardDescription>
        </Card>
        <Card>
          <CardTitle>Cobros</CardTitle>
          <CardDescription>MercadoPago y efectivo, en Fase 1.</CardDescription>
        </Card>
      </div>
    </main>
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

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 text-center">
      <div>{children}</div>
    </main>
  );
}
