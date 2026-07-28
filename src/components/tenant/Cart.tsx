"use client";

import { useEffect, useState, type FormEvent } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { clientDb, clientFunctions } from "@/lib/firebase/client";
import { formatARS } from "@/lib/format";
import { getOpenState, type OpenState } from "@/lib/opening-hours";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import type {
  CreateOrderInput,
  DeliveryZone,
  OrderChannel,
  OrderMode,
  TenantDoc,
} from "@/lib/types";
import { Button, Card, CardTitle, Input } from "@/components/ui";
import { useCart } from "./CartProvider";

type Step = "closed" | "checkout" | "done";

interface CreateOrderResult {
  orderId: string;
  number: number;
  total: number;
  status: string;
}

/** Resultado del checkout: pedido por app (con tracking) o por WhatsApp. */
type DoneResult = { kind: "app"; data: CreateOrderResult } | { kind: "whatsapp" };

/** Barra flotante del carrito + checkout en efectivo (retiro o envío). */
export function Cart({ tenantId }: { tenantId: string }) {
  const cart = useCart();
  const [step, setStep] = useState<Step>("closed");
  const [result, setResult] = useState<DoneResult | null>(null);
  const [openState, setOpenState] = useState<OpenState>({ open: true });
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [orderMode, setOrderMode] = useState<OrderMode>("app");
  const [whatsapp, setWhatsapp] = useState<string | undefined>(undefined);
  const [tenantName, setTenantName] = useState<string>("");

  // Estado abierto/cerrado, zonas y modo de pedido en vivo: si el local pausa
  // pedidos con el carrito armado, el checkout se bloquea al instante.
  useEffect(() => {
    return onSnapshot(doc(clientDb, `tenants/${tenantId}`), (snap) => {
      const data = snap.data() as TenantDoc | undefined;
      setOpenState(getOpenState(data?.config));
      setZones(data?.config?.deliveryZones ?? []);
      setOrderMode(data?.config?.orderMode ?? "app");
      setWhatsapp(data?.config?.whatsapp);
      setTenantName(data?.branding?.name ?? "");
    });
  }, [tenantId]);

  // Plan Presencia: si está en modo WhatsApp y hay número, el pedido sale
  // por WhatsApp en vez de entrar a la cola/cobros.
  const isWhatsApp = orderMode === "whatsapp" && !!whatsapp;

  if (step === "done" && result) {
    return (
      <Overlay>
        <Card className="w-full max-w-md text-center">
          <p className="text-4xl">{result.kind === "whatsapp" ? "💬" : "✅"}</p>
          {result.kind === "app" ? (
            <>
              <CardTitle className="mt-3 text-xl">
                ¡Pedido #{result.data.number} enviado!
              </CardTitle>
              <p className="mt-2 text-sm text-muted">
                Total: <strong>{formatARS(result.data.total)}</strong> — pagás en
                efectivo al recibirlo. El local va a confirmar tu pedido en breve.
              </p>
              <a href={`/pedido/${result.data.orderId}`}>
                <Button className="mt-6 w-full">Seguir mi pedido</Button>
              </a>
            </>
          ) : (
            <>
              <CardTitle className="mt-3 text-xl">Te llevamos a WhatsApp</CardTitle>
              <p className="mt-2 text-sm text-muted">
                Abrimos WhatsApp con tu pedido listo para enviar. Si no se abrió,
                revisá que tengas WhatsApp instalado y volvé a intentar.
              </p>
            </>
          )}
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
          zones={zones}
          whatsapp={isWhatsApp ? whatsapp : undefined}
          tenantName={tenantName}
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
  zones,
  whatsapp,
  tenantName,
  onClose,
  onDone,
}: {
  tenantId: string;
  zones: DeliveryZone[];
  /** Si viene, el pedido sale por WhatsApp a este número (Plan Presencia). */
  whatsapp?: string;
  tenantName: string;
  onClose: () => void;
  onDone: (r: DoneResult) => void;
}) {
  const cart = useCart();
  const [channel, setChannel] = useState<OrderChannel>("takeaway");
  const [zoneId, setZoneId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zone = zones.find((z) => z.id === zoneId);
  const deliveryFee = channel === "delivery" && zone ? zone.fee : 0;
  const totalToPay = cart.total + deliveryFee;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const phone = String(form.get("phone")).trim();
    const address = channel === "delivery" ? String(form.get("address")).trim() : undefined;
    const notes = String(form.get("notes")).trim() || undefined;

    // Plan Presencia: pedido por WhatsApp, sin backend.
    if (whatsapp) {
      const message = buildWhatsAppMessage(tenantName, {
        items: cart.items,
        itemsTotal: cart.total,
        customer: { name, phone },
        channel,
        address,
        zoneName: zone?.name,
        deliveryFee,
        notes,
      });
      window.open(buildWhatsAppUrl(whatsapp, message), "_blank");
      onDone({ kind: "whatsapp" });
      return;
    }

    const input: CreateOrderInput = {
      tenantId,
      items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      customer: { name, phone },
      channel,
      ...(address ? { address } : {}),
      ...(channel === "delivery" && zoneId ? { zoneId } : {}),
      ...(notes ? { notes } : {}),
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
      onDone({ kind: "app", data });
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
      <div className="mt-3 border-t border-border-soft pt-3 text-right">
        {deliveryFee > 0 && (
          <p className="text-sm text-muted">
            Envío ({zone!.name}): {formatARS(deliveryFee)}
          </p>
        )}
        <p className="font-bold">Total: {formatARS(totalToPay)}</p>
      </div>

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
          <>
            {zones.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="zone-select" className="text-sm font-medium text-strong">
                  Zona de entrega
                </label>
                <select
                  id="zone-select"
                  required
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="rounded-control border border-border-soft bg-card px-3.5 py-2.5 text-sm text-strong focus:border-primary focus:outline-none"
                >
                  <option value="" disabled>
                    Elegí tu zona…
                  </option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {z.fee === 0 ? "envío gratis" : formatARS(z.fee)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Input label="Dirección de entrega" name="address" required minLength={5} />
          </>
        )}
        <Input label="Aclaraciones (opcional)" name="notes" placeholder="Ej: sin cebolla" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy || cart.count === 0}>
          {busy
            ? "Enviando…"
            : whatsapp
              ? `Pedir por WhatsApp · ${formatARS(totalToPay)}`
              : `Confirmar pedido · efectivo · ${formatARS(totalToPay)}`}
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
