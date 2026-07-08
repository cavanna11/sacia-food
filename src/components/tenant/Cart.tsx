"use client";

import { useEffect, useState, type FormEvent } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { clientDb, clientFunctions } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import { getOpenState, type OpenState } from "@/lib/opening-hours";
import type { CreateOrderInput, OrderChannel, TenantDoc } from "@/lib/types";
import { Button, Card, CardTitle, Input } from "@/components/ui";
import { useCart } from "./CartProvider";

type Step = "closed" | "checkout" | "done";

interface CreateOrderResult {
  orderId: string;
  number: number;
  total: number;
  status: string;
}

/** Barra flotante del carrito + checkout en efectivo (retiro o envío). */
export function Cart({ tenantId }: { tenantId: string }) {
  const cart = useCart();
  const [step, setStep] = useState<Step>("closed");
  const [result, setResult] = useState<CreateOrderResult | null>(null);
  const [openState, setOpenState] = useState<OpenState>({ open: true });

  // Estado abierto/cerrado en vivo: si el local pausa pedidos con el
  // carrito armado, el checkout se bloquea al instante.
  useEffect(() => {
    return onSnapshot(doc(clientDb, `tenants/${tenantId}`), (snap) => {
      const data = snap.data() as TenantDoc | undefined;
      setOpenState(getOpenState(data?.config));
    });
  }, [tenantId]);

  if (step === "done" && result) {
    return (
      <Overlay>
        <Card className="w-full max-w-md text-center">
          <p className="text-4xl">✅</p>
          <CardTitle className="mt-3 text-xl">
            ¡Pedido #{result.number} enviado!
          </CardTitle>
          <p className="mt-2 text-sm text-muted">
            Total: <strong>{formatARS(result.total)}</strong> — pagás en efectivo
            al {"recibirlo"}. El local va a confirmar tu pedido en breve.
          </p>
          <a href={`/pedido/${result.orderId}`}>
            <Button className="mt-6 w-full">Seguir mi pedido</Button>
          </a>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => setStep("closed")}
          >
            Volver al menú
          </Button>
        </Card>
      </Overlay>
    );
  }

  if (step === "checkout") {
    return (
      <Overlay>
        <CheckoutForm
          tenantId={tenantId}
          onClose={() => setStep("closed")}
          onDone={(r) => {
            cart.clear();
            setResult(r);
            setStep("done");
          }}
        />
      </Overlay>
    );
  }

  if (!openState.open) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 p-4">
        <div className="mx-auto max-w-5xl rounded-control bg-strong px-4 py-3.5 text-center text-sm font-semibold text-bg shadow-lg">
          {openState.reason === "paused"
            ? "La tienda está pausada por unos minutos — probá de nuevo en un rato."
            : `Cerrado por ahora${openState.hoursLabel ? ` · horario: ${openState.hoursLabel}` : ""}.`}
        </div>
      </div>
    );
  }

  if (cart.count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4">
      <div className="mx-auto max-w-5xl">
        <Button
          className="w-full !py-3.5 shadow-lg"
          onClick={() => setStep("checkout")}
        >
          Ver pedido ({cart.count}) · {formatARS(cart.total)}
        </Button>
      </div>
    </div>
  );
}

function CheckoutForm({
  tenantId,
  onClose,
  onDone,
}: {
  tenantId: string;
  onClose: () => void;
  onDone: (r: CreateOrderResult) => void;
}) {
  const cart = useCart();
  const [channel, setChannel] = useState<OrderChannel>("takeaway");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input: CreateOrderInput = {
      tenantId,
      items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      customer: {
        name: String(form.get("name")),
        phone: String(form.get("phone")),
      },
      channel,
      ...(channel === "delivery" ? { address: String(form.get("address")) } : {}),
      ...(String(form.get("notes")).trim()
        ? { notes: String(form.get("notes")).trim() }
        : {}),
      paymentMethod: "cash",
    };
    setBusy(true);
    setError(null);
    try {
      const call = httpsCallable<CreateOrderInput, CreateOrderResult>(
        clientFunctions,
        "createOrder",
      );
      const { data } = await call(input);
      onDone(data);
    } catch (err) {
      setError(
        err instanceof Error && "message" in err && err.message !== "internal"
          ? err.message
          : "No pudimos enviar el pedido. Probá de nuevo.",
      );
      setBusy(false);
    }
  }

  return (
    <Card className="max-h-[90dvh] w-full max-w-md overflow-y-auto">
      <div className="flex items-center justify-between">
        <CardTitle className="text-xl">Tu pedido</CardTitle>
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {cart.items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <QtyButton label="−" onClick={() => cart.setQty(item.productId, item.qty - 1)} />
              <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
              <QtyButton label="+" onClick={() => cart.setQty(item.productId, item.qty + 1)} />
            </div>
            <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
            <span className="text-sm font-medium">{formatARS(item.price * item.qty)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border-soft pt-3 text-right font-bold">
        Total: {formatARS(cart.total)}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <ChannelButton
            active={channel === "takeaway"}
            onClick={() => setChannel("takeaway")}
            label="Retiro en local"
          />
          <ChannelButton
            active={channel === "delivery"}
            onClick={() => setChannel("delivery")}
            label="Envío a domicilio"
          />
        </div>
        <Input label="Tu nombre" name="name" required minLength={2} />
        <Input label="Teléfono" name="phone" type="tel" required placeholder="11 5555-5555" />
        {channel === "delivery" && (
          <Input label="Dirección de entrega" name="address" required minLength={5} />
        )}
        <Input label="Aclaraciones (opcional)" name="notes" placeholder="Ej: sin cebolla" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy || cart.count === 0}>
          {busy ? "Enviando…" : `Confirmar pedido · efectivo · ${formatARS(cart.total)}`}
        </Button>
      </form>
    </Card>
  );
}

function QtyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-border-soft text-sm font-bold text-strong hover:border-primary hover:text-primary"
      aria-label={label === "+" ? "Agregar uno" : "Quitar uno"}
    >
      {label}
    </button>
  );
}

function ChannelButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-control border px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border-soft text-muted hover:text-strong"
      }`}
    >
      {label}
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      {children}
    </div>
  );
}
