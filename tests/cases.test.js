import { describe, it, expect } from 'vitest';
import { CASES } from '../src/cases/index.js';
import { ACTIONS, REASONS } from '../src/cases/options.js';
import { createEngine } from '../src/game/engine.js';

const actionIds = ACTIONS.map((a) => a.id).sort();
const reasonIds = new Set(REASONS.map((r) => r.id));

it('has three cases with unique ids', () => {
  expect(CASES).toHaveLength(3);
  expect(new Set(CASES.map((c) => c.id)).size).toBe(3);
});

describe.each(CASES)('case $id', (c) => {
  it('has a complete chart and patient model', () => {
    for (const k of ['name', 'age', 'sex', 'ending', 'fine', 'dx', 'postOp', 'meds', 'rest', 'target', 'notes']) {
      expect(c.chart[k], k).toBeDefined();
    }
    for (const k of ['restHR', 'hrPerMet', 'restSBP', 'restDBP', 'sbpPerMet', 'spo2', 'rpeBase', 'rpePerMet']) {
      expect(typeof c.patient[k], k).toBe('number');
    }
  });

  it('steps are ordered, inside the session, and fully graded', () => {
    c.steps.forEach((s, i) => {
      if (i > 0) expect(s.at).toBeGreaterThan(c.steps[i - 1].at);
      expect(s.at).toBeLessThan(c.endAt);
      expect(Object.keys(s.grades).sort()).toEqual(actionIds);
      expect(Object.values(s.grades).filter((g) => g === 'best')).toHaveLength(1);
      for (const g of Object.values(s.grades)) expect(['best', 'ok', 'bad']).toContain(g);
      expect(s.reasons.length).toBeGreaterThan(0);
      for (const r of s.reasons) expect(reasonIds.has(r), r).toBe(true);
      expect(Boolean(s.question && s.explain && s.ref)).toBe(true);
      if (s.highlight) expect(s.highlight.from).toBeLessThan(s.highlight.to);
    });
  });

  it('only the last step may have stop as the best answer', () => {
    c.steps.forEach((s, i) => {
      if (s.grades.stop === 'best') expect(i).toBe(c.steps.length - 1);
    });
  });

  it('every event has a time and something to set', () => {
    for (const e of c.events) {
      expect(typeof e.at).toBe('number');
      expect(Object.keys(e.set).length).toBeGreaterThan(0);
    }
  });

  it('plays to the end with perfect answers, and vitals match the explanations', () => {
    const e = createEngine(c);
    for (let i = 0; i < 100000 && e.status !== 'done'; i++) {
      if (e.status === 'running') e.tick(1);
      else if (e.status === 'deciding') {
        const s = e.step;
        const v = e.vitals();
        for (const [k, [lo, hi]] of Object.entries(s.check ?? {})) {
          expect(v[k], `${s.id} ${k}`).toBeGreaterThanOrEqual(lo);
          expect(v[k], `${s.id} ${k}`).toBeLessThanOrEqual(hi);
        }
        const best = Object.keys(s.grades).find((a) => s.grades[a] === 'best');
        e.answer({ action: best, reasons: s.reasons });
      } else e.proceed();
    }
    expect(e.status).toBe('done');
    expect(e.results).toHaveLength(c.steps.length);
    expect(e.results.every((r) => r.tier === 'best' && r.reasonScore === 1)).toBe(true);
  });
});
