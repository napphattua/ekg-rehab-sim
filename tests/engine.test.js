import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/game/engine.js';

const fixture = (steps) => ({
  id: 'fx',
  patient: { restHR: 70, hrPerMet: 10, restSBP: 120, restDBP: 80, sbpPerMet: 8, spo2: 97, rpeBase: 7, rpePerMet: 1.5 },
  treadmill: { speed: 4.8, grade: 0 },
  endAt: 100,
  events: [{ at: 20, ramp: 10, set: { stMm: 2 } }],
  steps,
});
const A = { id: 'a', at: 10, grades: { continue: 'ok', increase: 'best', decrease: 'bad', stop: 'bad' }, reasons: ['rpe'] };
const B = { id: 'b', at: 50, grades: { continue: 'bad', increase: 'bad', decrease: 'ok', stop: 'best' }, reasons: ['st'] };

const tickUntil = (e, pred, max = 1000) => { for (let i = 0; i < max && !pred(); i++) e.tick(1); };

describe('engine', () => {
  it('runs until the first decision point', () => {
    const e = createEngine(fixture([A, B]));
    tickUntil(e, () => e.status !== 'running');
    expect(e.status).toBe('deciding');
    expect(e.t).toBe(10);
    expect(e.step.id).toBe('a');
  });

  it('ticks do nothing while deciding', () => {
    const e = createEngine(fixture([A, B]));
    tickUntil(e, () => e.status !== 'running');
    e.tick(5);
    expect(e.t).toBe(10);
  });

  it('answer → feedback, proceed applies the best action', () => {
    const e = createEngine(fixture([A, B]));
    tickUntil(e, () => e.status !== 'running');
    const r = e.answer({ action: 'continue', reasons: ['rpe'] });
    expect(r).toMatchObject({ stepId: 'a', tier: 'ok', best: 'increase' });
    expect(e.status).toBe('feedback');
    e.proceed();
    expect(e.status).toBe('running');
    expect(e.treadmill).toMatchObject({ speed: 4.8, grade: 2.5 });
  });

  it('exposes case modifiers as ECG params', () => {
    const e = createEngine(fixture([B]));
    tickUntil(e, () => e.t >= 25);
    expect(e.ecgParams().stMm).toBeCloseTo(1);
    expect(e.ecgParams().rhythm).toBe('sinus');
  });

  it('a best answer of stop ends the case', () => {
    const e = createEngine(fixture([B]));
    tickUntil(e, () => e.status !== 'running');
    e.answer({ action: 'stop', reasons: ['st'] });
    e.proceed();
    expect(e.status).toBe('done');
  });

  it('ends at endAt when no steps are left', () => {
    const e = createEngine(fixture([A]));
    tickUntil(e, () => e.status !== 'running');
    e.answer({ action: 'increase', reasons: ['rpe'] });
    e.proceed();
    tickUntil(e, () => e.status !== 'running');
    expect(e.status).toBe('done');
    expect(e.t).toBe(100);
  });

  it('rejects answers outside a decision', () => {
    const e = createEngine(fixture([A]));
    expect(() => e.answer({ action: 'stop', reasons: [] })).toThrow();
  });
});
