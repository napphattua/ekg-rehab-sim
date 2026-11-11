import { describe, it, expect } from 'vitest';
import { createEcg } from '../src/ecg/generator.js';

const CLEAN = { noise: 0, wander: 0 };

function record(params, seconds, seed = 1) {
  const ecg = createEcg({ seed });
  ecg.setParams({ ...CLEAN, ...params });
  const n = Math.round(seconds * ecg.fs);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = ecg.sample();
  return { samples, beats: ecg.drainBeats(), fs: ecg.fs };
}
const rrs = (beats) => beats.slice(1).map((b, i) => b.time - beats[i].time);
const cv = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length) / m;
};
// mean signal 80 ms after each R peak (J + 40 ms ≈ ST measurement point)
const stLevel = ({ samples, beats, fs }) => {
  const vals = beats.map((b) => samples[Math.round((b.time + 0.08) * fs)]).filter((v) => v !== undefined);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

describe('ECG generator', () => {
  it('sinus beat count matches HR', () => {
    const { beats } = record({ hr: 90 }, 60);
    expect(beats.length).toBeGreaterThanOrEqual(88);
    expect(beats.length).toBeLessThanOrEqual(92);
    expect(beats.every((b) => b.type === 'sinus')).toBe(true);
  });

  it('R peak is ~1.2 mV', () => {
    const { samples } = record({ hr: 75 }, 10);
    const max = Math.max(...samples);
    expect(max).toBeGreaterThan(1.1);
    expect(max).toBeLessThan(1.3);
  });

  it('ST level is ~0 at baseline and ~-0.25 mV with 2.5 mm depression', () => {
    expect(Math.abs(stLevel(record({ hr: 90, stMm: 0 }, 20)))).toBeLessThan(0.03);
    expect(stLevel(record({ hr: 90, stMm: 2.5 }, 20))).toBeCloseTo(-0.25, 1);
  });

  it('sinus is regular, AF is irregularly irregular', () => {
    expect(cv(rrs(record({ hr: 90 }, 60).beats))).toBeLessThan(0.03);
    const af = record({ hr: 140, rhythm: 'af' }, 60);
    expect(cv(rrs(af.beats))).toBeGreaterThan(0.1);
    // the first beat was scheduled before setParams switched the rhythm
    expect(af.beats.slice(1).every((b) => b.type === 'af')).toBe(true);
  });

  it('pvcEvery inserts unifocal PVCs with a full compensatory pause', () => {
    const { beats } = record({ hr: 60, pvcEvery: 5 }, 60);
    const pvcIdx = beats.map((b, i) => (b.type === 'pvc' ? i : -1)).filter((i) => i > 0 && i < beats.length - 1);
    expect(pvcIdx.length).toBeGreaterThanOrEqual(10);
    expect(pvcIdx.length).toBeLessThanOrEqual(13);
    for (const i of pvcIdx) {
      expect(beats[i - 1].type).toBe('sinus');
      expect(beats[i + 1].type).toBe('sinus');
      expect(beats[i + 1].time - beats[i - 1].time).toBeCloseTo(2.0, 1);
    }
  });

  it('is deterministic for a seed', () => {
    const a = record({ hr: 80, noise: 0.02 }, 5, 9).samples;
    const b = record({ hr: 80, noise: 0.02 }, 5, 9).samples;
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});
