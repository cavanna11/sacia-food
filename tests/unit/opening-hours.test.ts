import { describe, expect, it } from "vitest";
import { getOpenState } from "@/lib/opening-hours";

/** Construye un Date cuya hora en Buenos Aires (UTC-3) sea la pedida. */
function atBuenosAires(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  // 12:00 en BA = 15:00 UTC (BA no tiene horario de verano desde 2009).
  return new Date(Date.UTC(2026, 6, 8, h + 3, m));
}

describe("getOpenState", () => {
  it("sin config ni horarios: abierta 24 hs", () => {
    expect(getOpenState(undefined).open).toBe(true);
    expect(getOpenState({ acceptingOrders: true }).open).toBe(true);
  });

  it("pausa manual gana siempre", () => {
    const state = getOpenState(
      { acceptingOrders: false, hours: { open: "00:00", close: "23:59" } },
      atBuenosAires("12:00"),
    );
    expect(state.open).toBe(false);
    expect(state.reason).toBe("paused");
  });

  it("ventana normal: dentro abierto, fuera cerrado", () => {
    const config = { acceptingOrders: true, hours: { open: "09:00", close: "18:00" } };
    expect(getOpenState(config, atBuenosAires("12:00")).open).toBe(true);
    expect(getOpenState(config, atBuenosAires("08:59")).open).toBe(false);
    expect(getOpenState(config, atBuenosAires("18:00")).open).toBe(false);
  });

  it("ventana que cruza medianoche (20:00–02:00)", () => {
    const config = { acceptingOrders: true, hours: { open: "20:00", close: "02:00" } };
    expect(getOpenState(config, atBuenosAires("23:30")).open).toBe(true);
    expect(getOpenState(config, atBuenosAires("01:30")).open).toBe(true);
    expect(getOpenState(config, atBuenosAires("12:00")).open).toBe(false);
    expect(getOpenState(config, atBuenosAires("02:30")).open).toBe(false);
  });

  it("horarios malformados no rompen: abierta", () => {
    const config = { acceptingOrders: true, hours: { open: "banana", close: "18:00" } };
    expect(getOpenState(config, atBuenosAires("03:00")).open).toBe(true);
  });
});
