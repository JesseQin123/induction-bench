import { describe, it, expect } from "vitest";
import {
  DEFAULTS as p,
  INITIAL,
  STEP,
  advance,
  sample,
  linkage,
  gradient,
  apparatus,
  startSwing,
} from "../src/model";
describe("deterministic induction model", () => {
  it("obeys Faraday law by independent central difference", () => {
    const x = 0.024,
      v = 0.22,
      h = 1e-7;
    const numerical =
      -(linkage(p, x + v * h) - linkage(p, x - v * h)) / (2 * h);
    expect(sample(p, { ...INITIAL, x, velocity: v }).emf).toBeCloseTo(
      numerical,
      8,
    );
  });
  it("reverses EMF with velocity or polarity and scales with turns", () => {
    const s = { ...INITIAL, x: 0.03, velocity: 0.2 },
      e = sample(p, s).emf;
    expect(sample(p, { ...s, velocity: -0.2 }).emf).toBeCloseTo(-e);
    expect(sample({ ...p, polarity: -1 }, s).emf).toBeCloseTo(-e);
    expect(sample({ ...p, turns: 400 }, s).emf).toBeCloseTo(2 * e);
  });
  it("stationary magnets induce no voltage, perpendicular coils have no linkage", () => {
    expect(sample(p, INITIAL).emf).toBe(0);
    expect(linkage({ ...p, angle: 90 }, 0.01)).toBeCloseTo(0, 12);
  });
  it("current satisfies circuit law and induced force opposes motion", () => {
    const s = { ...INITIAL, x: 0.03, velocity: 0.2 };
    const r = sample({ ...p, battery: 4 }, s);
    expect(r.current * r.totalResistance).toBeCloseTo(r.emf + 4);
    expect(sample(p, s).force * s.velocity).toBeLessThan(0);
  });
  it("material and core changes affect the same model", () => {
    expect(apparatus({ ...p, wire: "NiCr" }).resistance).toBeGreaterThan(
      apparatus(p).resistance * 60,
    );
    expect(linkage({ ...p, core: true }, 0.02)).toBeCloseTo(
      linkage(p, 0.02) * 3,
    );
    expect(gradient(p, 0)).toBeCloseTo(0, 12);
  });
  it("repeats identically, bounds motion, stops and resets without residual velocity", () => {
    let a = startSwing(INITIAL),
      b = startSwing(INITIAL);
    for (let i = 0; i < 2400; i++) {
      a = advance(p, a, STEP);
      b = advance(p, b, STEP);
      expect(Math.abs(a.x)).toBeLessThanOrEqual(0.12);
    }
    expect(a).toEqual(b);
    expect(advance(p, { ...a, running: false }).time).toBe(a.time);
    expect(advance(p, { ...a, running: false }).velocity).toBe(0);
    expect(sample(p, INITIAL).current).toBe(0);
  });
});
