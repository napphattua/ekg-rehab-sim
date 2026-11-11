import { describe, it, expect } from 'vitest';
import { modsAt } from '../src/sim/modifiers.js';

const events = [
  { at: 10, ramp: 10, set: { stMm: 2 } },
  { at: 30, set: { stMm: 0, symptom: 'แน่นอก', monitorHr: 150, cues: ['sweat'] } },
  { at: 40, set: { monitorHr: null } },
];

describe('modsAt', () => {
  it('is empty before the first event', () => expect(modsAt(events, 5)).toEqual({}));
  it('interpolates a ramp', () => expect(modsAt(events, 15).stMm).toBeCloseTo(1));
  it('holds the ramp target after it ends', () => expect(modsAt(events, 25).stMm).toBe(2));
  it('snaps events without a ramp', () => {
    expect(modsAt(events, 30)).toEqual({ stMm: 0, symptom: 'แน่นอก', monitorHr: 150, cues: ['sweat'] });
  });
  it('null clears an override', () => expect(modsAt(events, 45).monitorHr).toBeNull());
  it('ramps from the previous value, not from zero', () => {
    const ev = [{ at: 0, set: { hrAdd: 10 } }, { at: 10, ramp: 10, set: { hrAdd: 30 } }];
    expect(modsAt(ev, 15).hrAdd).toBeCloseTo(20);
  });
});
