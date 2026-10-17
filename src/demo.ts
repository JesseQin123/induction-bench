import { DEFAULTS, INITIAL, STEP, advance, moveMagnet, sample, startSwing, type Params, type State, type Reading } from './model';

export const DEMO_FPS = 30;
export const DEMO_FRAMES = 40 * DEMO_FPS;
export type Replay = { frame: number; p: Params; state: State; history: Reading[] };
export const createReplay = (): Replay => ({ frame: 0, p: { ...DEFAULTS }, state: { ...INITIAL }, history: [] });

// Scripted input only: every output still comes from the ordinary model.
// Four 1/120 s physics steps produce each genuinely new 1/30 s frame.
export function nextReplay(previous: Replay): Replay {
  if (previous.frame >= DEMO_FRAMES) return previous;
  const frame = previous.frame + 1;
  let p = { ...previous.p }, state = { ...previous.state };
  if (frame === 270) state = startSwing(state);
  if (frame === 270) p.speed = 0.3;
  if (frame === 300) p.polarity = -1;
  if (frame === 390) { p.turns = 400; p.core = true; }
  if (frame === 480) p.wire = 'Al';
  if (frame === 570) p.angle = 65;
  if (frame === 660) p.angle = 0;
  if (frame === 690) p.battery = 2.5;
  if (frame === 840) p.battery = -2.5;
  if (frame === 930) p = { ...DEFAULTS, speed: 0.45 };
  if (frame === 1080) p.speed = 0.2;
  // Reproduce a continuous drag target through the same moveMagnet controller
  // used by the real canvas pointer handler and the accessible position slider.
  for (let substep = 1; substep <= 4; substep++) {
    const t = previous.frame / DEMO_FPS + substep * STEP;
    if (t >= 2 && frame < 270) {
      const stops = [[2, .105], [4, -.10], [6.5, .105], [9, -.08]];
      const i = t < 4 ? 0 : t < 6.5 ? 1 : 2;
      const [ta, xa] = stops[i], [tb, xb] = stops[i + 1];
      const u = (t - ta) / (tb - ta), eased = u * u * (3 - 2 * u);
      state = moveMagnet(state, xa + (xb - xa) * eased);
    }
    state = advance(p, state, STEP);
  }
  return { frame, p, state, history: [...previous.history, sample(p, state)].slice(-240) };
}

export function demoCaption(frame: number) {
  const t = frame / DEMO_FPS;
  if (t < 2) return ['Induction, made visible.', 'One magnet. One coil. One shared model.'];
  if (t < 9) return ['Drag the magnet through the coil.', 'Changing flux drives the meter and live traces.'];
  if (t < 13) return ['Reverse the poles.', 'The sign of the induced voltage reverses.'];
  if (t < 19) return ['Change the coil.', '400 turns, an iron core, then aluminium wire.'];
  if (t < 23) return ['Rotate the coil.', 'Less linked flux means less induced voltage.'];
  if (t < 28) return ['Add a 2.5 V battery.', 'The meter now reads battery + induced current.'];
  if (t < 31) return ['Reverse the battery.', 'The current and the meter change direction.'];
  if (t < 36) return ['Move faster. See the response.', 'Battery disconnected. Induction alone.'];
  return ['Explore it yourself.', 'Open source · MIT · github.com/JesseQin123/induction-bench'];
}
