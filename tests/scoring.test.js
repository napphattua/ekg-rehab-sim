import { describe, it, expect } from 'vitest';
import { scoreDecision } from '../src/game/scoring.js';

const step = { grades: { continue: 'bad', increase: 'bad', decrease: 'ok', stop: 'best' }, reasons: ['st', 'symptom'] };

describe('scoreDecision', () => {
  it('perfect answer', () => {
    expect(scoreDecision(step, { action: 'stop', reasons: ['st', 'symptom'] })).toEqual({
      tier: 'best', points: 3, reasonScore: 1, missed: [], extra: [], best: 'stop',
    });
  });
  it('a wrong extra reason cancels a right one', () => {
    const r = scoreDecision(step, { action: 'stop', reasons: ['st', 'bp'] });
    expect(r.reasonScore).toBe(0);
    expect(r.missed).toEqual(['symptom']);
    expect(r.extra).toEqual(['bp']);
  });
  it('acceptable action with half the reasons', () => {
    const r = scoreDecision(step, { action: 'decrease', reasons: ['st'] });
    expect(r.tier).toBe('ok');
    expect(r.points).toBe(1.5);
  });
  it('unsafe action scores 0 for the action', () => {
    expect(scoreDecision(step, { action: 'continue', reasons: [] }).points).toBe(0);
  });
});
