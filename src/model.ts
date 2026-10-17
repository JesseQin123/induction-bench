/** SI units. Deterministic, quasi-static teaching model; not a field solver. */
export const MAGNETS = {
  N52: { br: 1.4, name: "Neodymium" },
  N42: { br: 1.3, name: "Neodymium" },
  SmCo: { br: 1.1, name: "Samarium cobalt" },
  C8: { br: 0.39, name: "Ferrite" },
};
export const WIRES = {
  Cu: { rho: 16.8e-9, name: "Copper", color: "#cf7944" },
  Ag: { rho: 15.9e-9, name: "Silver", color: "#d2d8dc" },
  Al: { rho: 26.5e-9, name: "Aluminium", color: "#aab4bc" },
  NiCr: { rho: 1100e-9, name: "Nichrome", color: "#88888b" },
};
export type Params = {
  magnet: keyof typeof MAGNETS;
  wire: keyof typeof WIRES;
  turns: number;
  angle: number;
  core: boolean;
  battery: number;
  speed: number;
  polarity: number;
};
export type State = {
  time: number;
  x: number;
  velocity: number;
  phase: number;
  target: number;
  swinging: boolean;
  running: boolean;
};
export const DEFAULTS: Params = {
  magnet: "N52",
  wire: "Cu",
  turns: 200,
  angle: 0,
  core: false,
  battery: 0,
  speed: 0.2,
  polarity: 1,
};
export const INITIAL: State = {
  time: 0,
  x: 0.105,
  target: 0.105,
  velocity: 0,
  phase: Math.acos(0.105 / 0.12),
  swinging: false,
  running: true,
};
export const STEP = 1 / 120;
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export function apparatus(p: Params) {
  const layers = Math.ceil(p.turns / 24),
    radius = 0.015 + layers * 0.00025;
  const length = p.turns * 2 * Math.PI * radius;
  const resistance = (WIRES[p.wire].rho * length) / (Math.PI * 0.00025 ** 2);
  const inductance =
    ((1.256637e-6 * p.turns ** 2 * Math.PI * radius ** 2) / 0.03) *
    (p.core ? 3 : 1);
  return {
    layers,
    radius,
    length,
    resistance,
    totalResistance: resistance + 1,
    inductance,
  };
}
export function linkage(p: Params, x: number) {
  return (
    (p.polarity *
      p.turns *
      MAGNETS[p.magnet].br *
      7e-6 *
      (p.core ? 3 : 1) *
      Math.cos((p.angle * Math.PI) / 180)) /
    (1 + (x / 0.038) ** 2) ** 1.5
  );
}
export function gradient(p: Params, x: number) {
  return linkage(p, x) * ((-3 * x) / (0.038 ** 2 + x * x));
}
export function sample(p: Params, s: State) {
  const a = apparatus(p),
    flux = linkage(p, s.x),
    slope = gradient(p, s.x);
  const emf = -slope * s.velocity,
    induced = emf / a.totalResistance;
  const batteryCurrent = p.battery / a.totalResistance,
    current = induced + batteryCurrent;
  const field =
    ((1.256637e-6 * p.turns * current) /
      (2 * Math.sqrt(a.radius ** 2 + 0.006 ** 2))) *
    (p.core ? 3 : 1);
  const force = current * slope;
  return {
    ...a,
    time: s.time,
    x: s.x,
    velocity: s.velocity,
    flux,
    slope,
    emf,
    induced,
    batteryCurrent,
    current,
    field,
    force,
    power: current ** 2 * a.resistance,
  };
}
export type Reading = ReturnType<typeof sample>;
export function advance(p: Params, s: State, dt = STEP): State {
  if (!s.running) return { ...s, velocity: 0 };
  let phase = s.phase,
    x = s.x,
    velocity = 0;
  if (s.swinging) {
    phase += (p.speed / 0.12) * dt;
    x = 0.12 * Math.cos(phase);
    velocity = -p.speed * Math.sin(phase);
  } else {
    const dx = clamp(s.target, -0.15, 0.15) - x;
    const move = clamp(dx, -p.speed * dt, p.speed * dt);
    x += move;
    velocity = move / dt;
  }
  return { ...s, time: s.time + dt, x, velocity, phase };
}
export function startSwing(s: State): State {
  return {
    ...s,
    swinging: true,
    running: true,
    phase: Math.acos(clamp(s.x / 0.12, -1, 1)),
  };
}
/** Shared pointer, slider, keyboard and scripted-replay motion command. */
export function moveMagnet(s: State, x: number): State {
  return { ...s, target: clamp(x, -0.15, 0.15), swinging: false, running: true };
}
export function signed(n: number, digits = 2) {
  return `${n > 0 ? "+" : ""}${Math.abs(n) < 10 ** -digits / 2 ? (0).toFixed(digits) : n.toFixed(digits)}`;
}
