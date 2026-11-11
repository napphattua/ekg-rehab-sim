import { mulberry32 } from '../sim/rng.js';

// One Gaussian bump per wave. a = amplitude (mV), mu = centre (s from R peak), s = width (s).
const SINUS = [
  { a: 0.15, mu: -0.16, s: 0.025, isP: true },
  { a: -0.1, mu: -0.025, s: 0.01 },
  { a: 1.2, mu: 0, s: 0.012 },
  { a: -0.25, mu: 0.03, s: 0.012 },
  { a: 0.3, mu: 0.25, s: 0.05, isT: true },
];
// Wide QRS, no P wave, T opposite to the QRS.
const PVC = [
  { a: 1.4, mu: 0, s: 0.035 },
  { a: -0.35, mu: 0.07, s: 0.03 },
  { a: -0.45, mu: 0.3, s: 0.07, isT: true },
];
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function wave(beat, dt, stMm) {
  if (dt < -0.4 || dt > 0.9) return 0;
  const qt = Math.sqrt(beat.rr); // QT shortens as HR rises
  let v = 0;
  for (const w of beat.type === 'pvc' ? PVC : SINUS) {
    if (w.isP && beat.type === 'af') continue; // AF: no P waves
    const mu = w.isT ? w.mu * qt : w.mu;
    v += w.a * Math.exp(-((dt - mu) ** 2) / (2 * w.s * w.s));
  }
  if (stMm && beat.type !== 'pvc') {
    // horizontal ST depression from the J point (40 ms) into the start of T; 1 mm = 0.1 mV
    const end = 0.04 + 0.16 * qt;
    v -= stMm * 0.1 * (sigmoid((dt - 0.04) / 0.006) - sigmoid((dt - end) / 0.02));
  }
  return v;
}

export function createEcg({ fs = 250, seed = 1 } = {}) {
  const rand = mulberry32(seed);
  const p = { hr: 75, rhythm: 'sinus', stMm: 0, pvcEvery: 0, artifact: 0, noise: 0.02, wander: 0.05 };
  let t = 0;
  let sincePvc = 0; // normal beats since the last PVC
  let lastNormal = 0; // time of the last non-PVC beat
  let fresh = []; // beats that happened since the last drainBeats()

  const baseRR = () => 60 / Math.max(20, p.hr);

  function makeNext(b) {
    const rr = baseRR();
    if (p.rhythm === 'af') return { time: b.time + rr * (0.75 + rand() * 0.5), type: 'af', rr };
    if (b.type === 'pvc') return { time: lastNormal + 2 * rr, type: 'sinus', rr }; // full compensatory pause
    if (p.pvcEvery > 0 && sincePvc >= p.pvcEvery - 1) return { time: b.time + 0.6 * rr, type: 'pvc', rr };
    return { time: b.time + rr * (1 + (rand() - 0.5) * 0.04), type: 'sinus', rr };
  }

  let prev = { time: -0.8, type: 'sinus', rr: 0.8 };
  let cur = { time: 0, type: 'sinus', rr: 0.8 };
  let next = makeNext(cur);

  function sample() {
    while (t >= next.time) {
      prev = cur;
      cur = next;
      if (cur.type === 'pvc') sincePvc = 0;
      else {
        sincePvc += 1;
        lastNormal = cur.time;
      }
      fresh.push({ time: cur.time, type: cur.type });
      next = makeNext(cur);
    }
    let v = wave(prev, t - prev.time, p.stMm) + wave(cur, t - cur.time, p.stMm) + wave(next, t - next.time, p.stMm);
    v += p.wander * Math.sin(2 * Math.PI * 0.25 * t);
    v += p.noise * (rand() * 2 - 1);
    if (p.artifact > 0) {
      // motion artifact: fast, messy oscillation on top of the real complexes
      v += p.artifact * (0.8 * Math.sin(2 * Math.PI * 4.2 * t) + 0.4 * Math.sin(2 * Math.PI * 9.1 * t + 1.3) + 0.3 * (rand() * 2 - 1));
    }
    t += 1 / fs;
    return v;
  }

  return {
    fs,
    get t() {
      return t;
    },
    setParams(q) {
      Object.assign(p, q);
    },
    sample,
    drainBeats() {
      const out = fresh;
      fresh = [];
      return out;
    },
  };
}
