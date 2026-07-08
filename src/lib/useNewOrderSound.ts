"use client";

import { useEffect, useRef } from "react";

/**
 * Beep de pedido nuevo (WebAudio, sin assets). Suena cuando aparece un
 * pedido con createdAt mayor al último conocido — nunca en la carga inicial.
 */
export function useNewOrderSound(latestCreatedAt: number | null) {
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (latestCreatedAt === null) return;
    if (prev.current !== null && latestCreatedAt > prev.current) {
      beep();
    }
    prev.current = latestCreatedAt;
  }, [latestCreatedAt]);
}

function beep() {
  try {
    const ctx = new AudioContext();
    // Tres pulsos cortos, como campana de mostrador.
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Sin permiso de audio todavía (falta gesto del usuario): silencio.
  }
}
