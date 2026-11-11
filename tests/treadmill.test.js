import { describe, it, expect } from 'vitest';
import { metsFor, stepWorkload } from '../src/sim/treadmill.js';
import { mulberry32 } from '../src/sim/rng.js';

describe('metsFor (ACSM equations)', () => {
  it('walking, level', () => expect(metsFor(3.2, 0)).toBeCloseTo(2.52, 2));
  it('walking, 5% grade', () => expect(metsFor(4.8, 5)).toBeCloseTo(5.34, 2));
  it('running above 8 km/h', () => expect(metsFor(9, 0)).toBeCloseTo(9.57, 2));
});

describe('stepWorkload (~1 MET per step)', () => {
  it('increase raises grade by ~1 MET, rounded to 0.5%', () => {
    expect(stepWorkload({ speed: 4.8, grade: 0 }, +1)).toEqual({ speed: 4.8, grade: 2.5 });
  });
  it('increase is about one MET', () => {
    const next = stepWorkload({ speed: 4.8, grade: 0 }, +1);
    expect(metsFor(next.speed, next.grade) - metsFor(4.8, 0)).toBeCloseTo(1, 0);
  });
  it('increase at the grade cap raises speed instead', () => {
    expect(stepWorkload({ speed: 4.8, grade: 14 }, +1)).toEqual({ speed: 5.3, grade: 14 });
  });
  it('decrease lowers grade first', () => {
    expect(stepWorkload({ speed: 4.8, grade: 2.5 }, -1)).toEqual({ speed: 4.8, grade: 0 });
  });
  it('decrease on the flat lowers speed by 1 km/h, not below 1.5', () => {
    expect(stepWorkload({ speed: 3.2, grade: 0 }, -1)).toEqual({ speed: 2.2, grade: 0 });
    expect(stepWorkload({ speed: 2.0, grade: 0 }, -1)).toEqual({ speed: 1.5, grade: 0 });
  });
});

describe('mulberry32', () => {
  it('is deterministic per seed and in [0, 1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
