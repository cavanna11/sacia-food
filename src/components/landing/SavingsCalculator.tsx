"use client";

import { useState } from "react";
import { formatARS } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui";

/** Abono mensual de referencia del plan Gestión (ARS). Ajustable. */
const PLAN_GESTION_ARS = 45000;

/**
 * Calculadora interactiva: cuánto pierde un comercio en comisiones de
 * apps de delivery vs el abono fijo. Es el argumento de venta central.
 */
export function SavingsCalculator() {
  const [ticket, setTicket] = useState(12000);
  const [ordersPerMonth, setOrdersPerMonth] = useState(200);
  const [commission, setCommission] = useState(28);

  const monthlyRevenue = ticket * ordersPerMonth;
  const commissionCost = Math.round((monthlyRevenue * commission) / 100);
  const savings = commissionCost - PLAN_GESTION_ARS;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardTitle className="text-xl">¿Cuánto te comen las apps de delivery?</CardTitle>
      <p className="mt-1 text-sm text-muted">
        Meté tus números reales y mirá la diferencia contra un abono fijo.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <Slider
          label="Ticket promedio"
          value={ticket}
          display={formatARS(ticket)}
          min={3000}
          max={50000}
          step={500}
          onChange={setTicket}
        />
        <Slider
          label="Pedidos por mes"
          value={ordersPerMonth}
          display={String(ordersPerMonth)}
          min={20}
          max={1000}
          step={10}
          onChange={setOrdersPerMonth}
        />
        <Slider
          label="Comisión de la app"
          value={commission}
          display={`${commission}%`}
          min={15}
          max={35}
          step={1}
          onChange={setCommission}
        />
      </div>

      <div className="mt-8 grid gap-3 rounded-card border border-border-soft p-4 sm:grid-cols-3">
        <Figure label="Le regalás a la app / mes" value={formatARS(commissionCost)} negative />
        <Figure label="Con tienda propia / mes" value={formatARS(PLAN_GESTION_ARS)} />
        <Figure
          label="Te ahorrás por año"
          value={savings > 0 ? formatARS(savings * 12) : "—"}
          highlight
        />
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Cálculo estimativo con el plan Gestión de referencia. Tus clientes y tus
        datos quedan con vos, no con la app.
      </p>
    </Card>
  );
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-lg font-bold text-primary tabular-nums">{display}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--tenant-primary)]"
      />
    </label>
  );
}

function Figure({
  label,
  value,
  negative,
  highlight,
}: {
  label: string;
  value: string;
  negative?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-control p-3 text-center ${highlight ? "bg-primary/10" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-black tabular-nums ${
          negative ? "text-red-600" : highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
