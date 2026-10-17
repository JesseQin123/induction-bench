import { describe, it, expect } from 'vitest';
import { createReplay, nextReplay, DEMO_FRAMES, DEMO_FPS } from '../src/demo';
import { DEFAULTS, INITIAL, moveMagnet, sample } from '../src/model';
describe('deterministic guided demonstration', () => {
  it('renders exactly 40 seconds of bounded, finite model states without wall-clock dependence', () => {
    let a = createReplay(), b = createReplay();
    const snapshots = new Map<number, typeof a>();
    for (let i = 0; i < DEMO_FRAMES; i++) {
      a = nextReplay(a); b = nextReplay(b);
      expect(Math.abs(a.state.x)).toBeLessThanOrEqual(.15);
      expect(Object.values(sample(a.p,a.state)).every(Number.isFinite)).toBe(true);
      if ([85, 120, 299, 300, 390, 480, 570, 690, 840, 930].includes(a.frame)) snapshots.set(a.frame,a);
    }
    expect(a).toEqual(b);
    expect(a.frame).toBe(DEMO_FRAMES);
    expect(a.state.time).toBeCloseTo(DEMO_FRAMES / DEMO_FPS, 8);
    expect(a.history).toHaveLength(240);
    expect(nextReplay(a)).toBe(a);
    expect(snapshots.get(120)!.state.x).toBeLessThan(-.09);
    const drag = snapshots.get(85)!;
    expect(Math.abs(drag.state.velocity)).toBeGreaterThan(.1);
    expect(Math.abs(sample(drag.p,drag.state).emf)).toBeGreaterThan(.001);
    expect(snapshots.get(299)!.p.polarity).toBe(1);
    expect(snapshots.get(300)!.p.polarity).toBe(-1);
    expect(snapshots.get(390)!.p).toMatchObject({turns:400,core:true});
    expect(snapshots.get(480)!.p.wire).toBe('Al');
    expect(snapshots.get(570)!.p.angle).toBe(65);
    expect(sample(snapshots.get(690)!.p,snapshots.get(690)!.state).current).toBeGreaterThan(0);
    expect(sample(snapshots.get(840)!.p,snapshots.get(840)!.state).current).toBeLessThan(0);
    expect(snapshots.get(930)!.p).toEqual({...DEFAULTS,speed:.45});
  });
  it('uses a shared bounded motion command and does not teleport the magnet', () => {
    const next = moveMagnet({...INITIAL, swinging:true, running:false}, -10);
    expect(next.x).toBe(INITIAL.x);
    expect(next.target).toBe(-.15);
    expect(next.swinging).toBe(false);
    expect(next.running).toBe(true);
  });
});
