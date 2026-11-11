# Rehab Monitor Sim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web simulator 3D ให้ PT ฝึกตัดสินใจระหว่าง exercise ใน cardiac rehab โดยดูคลื่นหัวใจ lead II, สัญญาณชีพ และตัวคนไข้บนลู่วิ่ง แล้วเลือก ไปต่อ / เพิ่ม / ลด / หยุด พร้อมเหตุผล — 3 เคส, deploy เป็นลิงก์ให้เพื่อนเล่น

**Architecture:** แยก logic ล้วน (ECG generator, physiology, treadmill METs, case events, scoring, game engine) ออกจาก browser code ทั้งหมด → logic ทดสอบด้วย Vitest ได้ครบ. ฝั่ง browser มี 4 ชิ้น: monitor (canvas 2D), strip (canvas 2D), beeper (Web Audio), scene (three.js) ต่อกันใน `main.js` ด้วย game loop เดียว. เคสเป็น data ล้วนใน `src/cases/` เพื่อให้ผู้รีวิวแก้เนื้อหาได้โดยไม่แตะ logic และมี test คุมความสอดคล้องระหว่างตัวเลขใน sim กับคำเฉลย

**Tech Stack:** Vite 6, three.js 0.170, Vitest 3, JavaScript (ESM, ไม่มี framework), GitHub Pages + Actions

**Spec:** `docs/superpowers/specs/2026-11-11-rehab-monitor-sim-design.md`

---

## โครงสร้างไฟล์

```
ekg-rehab-sim/
├─ index.html                 layout หน้าเดียว (scene ซ้าย, monitor ขวา, overlay)
├─ package.json / vite.config.js / .gitignore
├─ .claude/launch.json        dev server สำหรับ preview
├─ .github/workflows/deploy.yml
├─ src/
│  ├─ main.js                 game loop + ต่อทุกชิ้นเข้าด้วยกัน
│  ├─ config.js               FEEDBACK_FORM_URL
│  ├─ style.css
│  ├─ sim/rng.js              seeded PRNG
│  ├─ sim/treadmill.js        ACSM METs + ปรับลู่ทีละ ~1 MET
│  ├─ sim/modifiers.js        events ของเคส → ค่าที่ active ณ เวลา t
│  ├─ sim/patient.js          HR/BP/RPE/SpO₂ จาก METs + modifiers
│  ├─ ecg/generator.js        คลื่น lead II สังเคราะห์ (sinus, AF, PVC, ST↓, artifact)
│  ├─ game/scoring.js         ให้คะแนน action + เหตุผล
│  ├─ game/engine.js          state machine ของเคส
│  ├─ cases/options.js        ACTIONS, REASONS
│  ├─ cases/index.js          3 เคส (data)
│  ├─ ui/monitor.js           sweep display + history สำหรับ strip
│  ├─ ui/strip.js             กระดาษ EKG + ไฮไลต์
│  ├─ ui/screens.js           menu / chart / decision / feedback / summary
│  ├─ audio/beeper.js         บี๊บ + alarm
│  └─ scene/runner.js         three.js ลู่วิ่ง + คน
└─ tests/                     Vitest (logic ล้วน)
```

**หน่วยที่ใช้ทั้งโปรเจกต์:** เวลา sim = วินาทีใน session (ย่อ 6×), เวลา ECG = วินาทีจริง, ST เป็น mm (1 mm = 0.1 mV), ความเร็ว km/h, ความชัน %.

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `index.html`, `src/main.js`, `.claude/launch.json`

- [ ] **Step 1: git init + .gitignore**

```bash
cd ~/ekg-rehab-sim && git init -b main
```

`.gitignore`:
```
node_modules
dist
.DS_Store
```

- [ ] **Step 2: package.json**

```json
{
  "name": "ekg-rehab-sim",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: ติดตั้ง dependencies**

```bash
npm install three@0.170.0 && npm install -D vite@6 vitest@3
```
Expected: `node_modules/` ถูกสร้าง, `package-lock.json` มี three, vite, vitest

- [ ] **Step 4: vite.config.js** (`base: './'` ให้ทำงานใต้ path ของ GitHub Pages)

```js
import { defineConfig } from 'vite';

export default defineConfig({ base: './' });
```

- [ ] **Step 5: index.html + main.js ชั่วคราว** (Task 12 เขียนทับ)

`index.html`:
```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rehab Monitor Sim</title>
  </head>
  <body>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`src/main.js`:
```js
document.body.textContent = 'Rehab Monitor Sim — scaffold OK';
```

- [ ] **Step 6: .claude/launch.json**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

- [ ] **Step 7: ตรวจ build**

Run: `npm run build`
Expected: `✓ built in …` และมี `dist/index.html`

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite + three.js project"
```

---

### Task 2: Seeded RNG + treadmill METs

**Files:**
- Create: `src/sim/rng.js`, `src/sim/treadmill.js`
- Test: `tests/treadmill.test.js`

- [ ] **Step 1: Write the failing test**

`tests/treadmill.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/treadmill.test.js`
Expected: FAIL — `Failed to resolve import "../src/sim/treadmill.js"`

- [ ] **Step 3: Implement**

`src/sim/rng.js`:
```js
// Seeded PRNG so tests and replays are deterministic.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`src/sim/treadmill.js`:
```js
// ACSM metabolic equations. speed in km/h, grade in %.
// Walking: VO2 = 0.1·S + 1.8·S·G + 3.5 ; Running (> 8 km/h): VO2 = 0.2·S + 0.9·S·G + 3.5
export function metsFor(speedKmh, gradePct) {
  const S = (speedKmh * 1000) / 60; // m/min
  const G = gradePct / 100;
  const vo2 = speedKmh > 8 ? 0.2 * S + 0.9 * S * G + 3.5 : 0.1 * S + 1.8 * S * G + 3.5;
  return vo2 / 3.5;
}

const MAX_GRADE = 15;
const MIN_SPEED = 1.5;
const round1 = (x) => Math.round(x * 10) / 10;

// dir +1 = เพิ่ม ~1 MET, -1 = ลด ~1 MET. Grade moves first so the gait stays the same.
export function stepWorkload({ speed, grade }, dir) {
  const S = (speed * 1000) / 60;
  const dG = Math.max(0.5, Math.round((3.5 / (1.8 * S)) * 100 * 2) / 2);
  if (dir > 0) {
    if (grade + dG <= MAX_GRADE) return { speed, grade: grade + dG };
    return { speed: round1(speed + 0.5), grade };
  }
  if (grade > 0) return { speed, grade: Math.max(0, grade - dG) };
  return { speed: Math.max(MIN_SPEED, round1(speed - 1)), grade: 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/treadmill.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/sim tests/treadmill.test.js && git commit -m "feat: ACSM treadmill METs and 1-MET workload steps"
```

---

### Task 3: Case event modifiers

เคสบอกการเปลี่ยนแปลงเป็นรายการ event `{ at, ramp?, set }`. ค่าตัวเลขที่มี `ramp` ค่อยๆ เปลี่ยนจากค่าก่อนหน้า; ที่ไม่มี `ramp` หรือไม่ใช่ตัวเลข (symptom, rhythm, cues, `null`) เปลี่ยนทันที

**Files:**
- Create: `src/sim/modifiers.js`
- Test: `tests/modifiers.test.js`

- [ ] **Step 1: Write the failing test**

`tests/modifiers.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modifiers.test.js`
Expected: FAIL — cannot resolve `../src/sim/modifiers.js`

- [ ] **Step 3: Implement**

`src/sim/modifiers.js`:
```js
// Case events → modifiers active at sim time t. `events` must be sorted by `at`.
export function modsAt(events, t) {
  const m = {};
  for (const ev of events) {
    if (t < ev.at) break;
    const k = ev.ramp ? Math.min(1, (t - ev.at) / ev.ramp) : 1;
    for (const [key, val] of Object.entries(ev.set)) {
      if (ev.ramp && typeof val === 'number') {
        const from = m[key] ?? 0;
        m[key] = from + (val - from) * k;
      } else {
        m[key] = val;
      }
    }
  }
  return m;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modifiers.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/sim/modifiers.js tests/modifiers.test.js && git commit -m "feat: case event modifiers with ramps"
```

---

### Task 4: Patient physiology

HR และ SBP วิ่งเข้าหาเป้าแบบ first-order lag (τ = 30 วินาที sim) เป้า = ค่าพัก + (METs − 1) × ค่าต่อ MET + modifier ของเคส

**Files:**
- Create: `src/sim/patient.js`
- Test: `tests/patient.test.js`

- [ ] **Step 1: Write the failing test**

`tests/patient.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createPatient } from '../src/sim/patient.js';

const cfg = { restHR: 64, hrPerMet: 5, restSBP: 122, restDBP: 76, sbpPerMet: 8, spo2: 97, rpeBase: 7, rpePerMet: 1.8 };
const run = (p, secs, mets, mods = {}) => { for (let i = 0; i < secs; i++) p.tick(1, mets, mods); };

describe('patient', () => {
  it('starts at rest values', () => {
    const v = createPatient(cfg).vitals(1, {});
    expect(v).toMatchObject({ hr: 64, monitorHr: 64, pr: 64, sbp: 122, dbp: 76, spo2: 97, rpe: 7 });
  });
  it('HR settles at rest + (METs-1)·hrPerMet', () => {
    const p = createPatient(cfg);
    run(p, 300, 3);
    expect(p.vitals(3, {}).hr).toBe(74);
  });
  it('HR lags: about 63% of the way after 30 s', () => {
    const p = createPatient(cfg);
    run(p, 30, 3);
    expect(p.state.hr).toBeCloseTo(64 + 10 * 0.632, 0);
  });
  it('applies hrAdd and sbpAdd', () => {
    const p = createPatient(cfg);
    run(p, 300, 1, { hrAdd: 50, sbpAdd: -10 });
    const v = p.vitals(1, {});
    expect(v.hr).toBe(114);
    expect(v.sbp).toBe(112);
  });
  it('monitorHr can be overridden (artifact) while PR stays true', () => {
    const v = createPatient(cfg).vitals(1, { monitorHr: 176 });
    expect(v.monitorHr).toBe(176);
    expect(v.pr).toBe(64);
  });
  it('RPE follows METs and clamps to 6–20', () => {
    const p = createPatient(cfg);
    expect(p.vitals(2.5, {}).rpe).toBe(10); // 7 + 1.5·1.8 = 9.7
    expect(p.vitals(20, {}).rpe).toBe(20);
    expect(p.vitals(1, { rpeAdd: -5 }).rpe).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/patient.test.js`
Expected: FAIL — cannot resolve `../src/sim/patient.js`

- [ ] **Step 3: Implement**

`src/sim/patient.js`:
```js
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const TAU = 30; // seconds of sim time for HR/BP to move ~63% toward target

export function createPatient(cfg) {
  const state = { hr: cfg.restHR, sbp: cfg.restSBP };
  return {
    state,
    tick(dtSim, mets, mods) {
      const k = 1 - Math.exp(-dtSim / TAU);
      const hrTarget = cfg.restHR + (mets - 1) * cfg.hrPerMet + (mods.hrAdd ?? 0);
      const sbpTarget = cfg.restSBP + (mets - 1) * cfg.sbpPerMet + (mods.sbpAdd ?? 0);
      state.hr += (hrTarget - state.hr) * k;
      state.sbp += (sbpTarget - state.sbp) * k;
    },
    vitals(mets, mods) {
      const hr = Math.round(state.hr);
      return {
        hr,
        monitorHr: mods.monitorHr ?? hr, // what the telemetry counts (artifact can fool it)
        pr: hr, // pulse rate from the oximeter = the real heart rate
        spo2: Math.round(cfg.spo2 + (mods.spo2Add ?? 0)),
        rpe: clamp(Math.round(cfg.rpeBase + (mets - 1) * cfg.rpePerMet + (mods.rpeAdd ?? 0)), 6, 20),
        sbp: Math.round(state.sbp),
        dbp: Math.round(cfg.restDBP + (mods.dbpAdd ?? 0)),
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/patient.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/sim/patient.js tests/patient.test.js && git commit -m "feat: patient HR/BP/RPE model"
```

---

### Task 5: ECG generator (lead II)

แต่ละ beat = ผลรวม Gaussian (P, Q, R, S, T) รอบ R peak. คำนวณ sample จาก 3 beat (ก่อน, ปัจจุบัน, ถัดไป) เพื่อให้ T ของ beat ก่อนหน้าและ P ของ beat ถัดไปต่อกันถูก. QT หดตาม HR (คูณ √RR). AF = ไม่มี P + RR สุ่ม ±25% + ไม่มี PVC. PVC = QRS กว้าง ไม่มี P, T กลับหัว, มาเร็ว 60% ของ RR ตามด้วย full compensatory pause. ST depression = แอ่งแนวนอนจาก J point ถึงต้น T

**Files:**
- Create: `src/ecg/generator.js`
- Test: `tests/generator.test.js`

- [ ] **Step 1: Write the failing test**

`tests/generator.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator.test.js`
Expected: FAIL — cannot resolve `../src/ecg/generator.js`

- [ ] **Step 3: Implement**

`src/ecg/generator.js`:
```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ecg tests/generator.test.js && git commit -m "feat: synthetic lead II ECG (sinus, AF, PVC, ST depression, artifact)"
```

---

### Task 6: Options + scoring

คะแนนต่อจุด = tier (ดีที่สุด 2 / ยอมรับได้ 1 / ไม่เหมาะสม 0) + เหตุผล (ถูก − เกิน) ÷ จำนวนที่ควรติ๊ก (0–1)

**Files:**
- Create: `src/cases/options.js`, `src/game/scoring.js`
- Test: `tests/scoring.test.js`

- [ ] **Step 1: Write the failing test**

`tests/scoring.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scoring.test.js`
Expected: FAIL — cannot resolve `../src/game/scoring.js`

- [ ] **Step 3: Implement**

`src/cases/options.js`:
```js
export const ACTIONS = [
  { id: 'continue', label: 'ไปต่อ' },
  { id: 'increase', label: 'เพิ่มความหนัก' },
  { id: 'decrease', label: 'ลดความหนัก' },
  { id: 'stop', label: 'หยุด' },
];

export const REASONS = [
  { id: 'hr', label: 'HR / การตอบสนองของ HR' },
  { id: 'rhythm', label: 'จังหวะการเต้น (rhythm)' },
  { id: 'st', label: 'ST segment' },
  { id: 'artifact', label: 'คลื่นรบกวน (artifact) — QRS จริงยังเดินสม่ำเสมอ' },
  { id: 'bp', label: 'BP' },
  { id: 'spo2', label: 'SpO₂' },
  { id: 'rpe', label: 'RPE' },
  { id: 'symptom', label: 'อาการที่คนไข้บอก' },
  { id: 'signs', label: 'อาการแสดงที่เห็น (เหงื่อ ซีด กุมอก จับราว)' },
  { id: 'target', label: 'เทียบกับเป้าหมายการฝึก' },
  { id: 'meds', label: 'ผลของยา (เช่น beta-blocker)' },
];
```

`src/game/scoring.js`:
```js
export const TIER_POINTS = { best: 2, ok: 1, bad: 0 };

export function scoreDecision(step, { action, reasons }) {
  const correct = new Set(step.reasons);
  const chosen = new Set(reasons);
  const hits = [...chosen].filter((r) => correct.has(r)).length;
  const extra = [...chosen].filter((r) => !correct.has(r));
  const missed = step.reasons.filter((r) => !chosen.has(r));
  const reasonScore = Math.max(0, hits - extra.length) / correct.size;
  const tier = step.grades[action];
  const best = Object.keys(step.grades).find((a) => step.grades[a] === 'best');
  return { tier, points: TIER_POINTS[tier] + reasonScore, reasonScore, missed, extra, best };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scoring.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/cases/options.js src/game/scoring.js tests/scoring.test.js && git commit -m "feat: decision options and scoring"
```

---

### Task 7: Game engine

State: `running → deciding → feedback → running … → done`. หลังเฉลย engine ใช้ **คำตอบที่ดีที่สุด** เสมอ (ครูพี่เลี้ยงปรับให้) เพื่อให้เคสเป็นเส้นเรื่องเดียว ถ้าคำตอบดีที่สุดคือหยุด เคสจบ

**Files:**
- Create: `src/game/engine.js`
- Test: `tests/engine.test.js`

- [ ] **Step 1: Write the failing test**

`tests/engine.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine.test.js`
Expected: FAIL — cannot resolve `../src/game/engine.js`

- [ ] **Step 3: Implement**

`src/game/engine.js`:
```js
import { modsAt } from '../sim/modifiers.js';
import { createPatient } from '../sim/patient.js';
import { metsFor, stepWorkload } from '../sim/treadmill.js';
import { scoreDecision } from './scoring.js';

export function createEngine(caseDef) {
  const patient = createPatient(caseDef.patient);
  const events = [...caseDef.events].sort((a, b) => a.at - b.at);
  const steps = caseDef.steps;
  const results = [];
  let t = 0;
  let tm = { ...caseDef.treadmill };
  let stepIdx = 0;
  let status = 'running'; // running → deciding → feedback → running … → done

  const mets = () => metsFor(tm.speed, tm.grade);
  const mods = () => modsAt(events, t);

  return {
    caseDef,
    results,
    get t() {
      return t;
    },
    get status() {
      return status;
    },
    get step() {
      return steps[stepIdx] ?? null;
    },
    get treadmill() {
      return { ...tm, mets: mets() };
    },

    tick(dtSim) {
      if (status !== 'running') return;
      t += dtSim;
      patient.tick(dtSim, mets(), mods());
      const step = steps[stepIdx];
      if (step && t >= step.at) status = 'deciding';
      else if (!step && t >= caseDef.endAt) status = 'done';
    },

    vitals() {
      const m = mods();
      return { ...patient.vitals(mets(), m), symptom: m.symptom ?? null, cues: m.cues ?? [] };
    },

    ecgParams() {
      const m = mods();
      return {
        hr: patient.state.hr,
        rhythm: m.rhythm ?? 'sinus',
        stMm: m.stMm ?? 0,
        pvcEvery: m.pvcEvery ?? 0,
        artifact: m.artifact ?? 0,
        noise: 0.015 + 0.004 * tm.speed, // more movement noise at higher speed
      };
    },

    answer(choice) {
      if (status !== 'deciding') throw new Error(`answer() while ${status}`);
      const step = steps[stepIdx];
      const result = { stepId: step.id, choice, ...scoreDecision(step, choice) };
      results.push(result);
      status = 'feedback';
      return result;
    },

    proceed() {
      if (status !== 'feedback') throw new Error(`proceed() while ${status}`);
      const { best } = results[results.length - 1];
      stepIdx += 1;
      if (best === 'stop') {
        status = 'done';
        return;
      }
      if (best === 'increase') tm = stepWorkload(tm, +1);
      if (best === 'decrease') tm = stepWorkload(tm, -1);
      status = 'running';
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.js tests/engine.test.js && git commit -m "feat: case engine state machine"
```

---

### Task 8: Case content (3 เคส) + content tests

แต่ละ step มี `check` = ช่วงค่าสัญญาณชีพ ณ จุดตัดสินใจ ซึ่งต้องตรงกับตัวเลขที่เขียนใน `explain`. Test เล่นทุกเคสจนจบด้วยคำตอบที่ดีที่สุดและตรวจ `check` → ถ้าใครแก้ตัวเลขเคสแล้วเฉลยไม่ตรง test จะ fail
**ถ้า `check` fail ให้แก้ค่าในเคสหรือแก้ตัวเลขใน `explain` ให้ตรงกัน ห้ามขยาย range เพื่อให้ผ่าน**

**Files:**
- Create: `src/cases/index.js`
- Test: `tests/cases.test.js`

- [ ] **Step 1: Write the failing test**

`tests/cases.test.js`:
```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cases.test.js`
Expected: FAIL — cannot resolve `../src/cases/index.js`

- [ ] **Step 3: Write the cases**

`src/cases/index.js`:
```js
// Clinical content — DRAFT, not yet reviewed by a specialist.
// Times (`at`, `ramp`, `endAt`) are seconds of session time (the game runs 6× faster).
// `check` = vital-sign ranges at the decision point; they must match the numbers in `explain`.
// Reviewers: pin the edition and page for every `ref`.

const ACSM = 'ACSM’s Guidelines for Exercise Testing and Prescription';
const AACVPR = 'AACVPR Guidelines for Cardiac Rehabilitation Programs';

export const CASES = [
  {
    id: 'cabg-artifact',
    title: 'เคส 1 — หลัง CABG: เดินเบาไป แล้วจอขึ้นคลื่นแปลก',
    chart: {
      name: 'คุณสมชาย', age: 62, sex: 'ชาย', ending: 'ครับ', fine: 'ยังไหวครับ เดินสบายๆ',
      dx: 'CABG ×3 (LIMA-LAD, SVG-OM, SVG-RCA)',
      postOp: '6 สัปดาห์',
      meds: ['Metoprolol 25 mg bid', 'Aspirin 81 mg', 'Atorvastatin 40 mg'],
      rest: 'HR 64 · BP 122/76 · SpO₂ 97%',
      target: 'RPE 11–14 (ได้ beta-blocker → ใช้ RPE เป็นหลัก) · HR ไม่เกิน rest + 30',
      notes: 'แผลกระดูกอกหายดี ไม่มีอาการเจ็บอกตั้งแต่ผ่าตัด',
    },
    patient: { restHR: 64, hrPerMet: 5, restSBP: 122, restDBP: 76, sbpPerMet: 8, spo2: 97, rpeBase: 7, rpePerMet: 1.8 },
    treadmill: { speed: 3.2, grade: 0 },
    endAt: 900,
    events: [
      { at: 480, set: { artifact: 1, monitorHr: 176 } },
      { at: 660, set: { artifact: 0, monitorHr: null } },
    ],
    steps: [
      {
        id: 'c1-s1',
        at: 240,
        question: 'ผ่าน warm-up มา 4 นาที คนไข้เดินสบาย จะทำอย่างไรต่อ?',
        grades: { continue: 'ok', increase: 'best', decrease: 'bad', stop: 'bad' },
        reasons: ['rpe', 'target', 'meds'],
        check: { rpe: [9, 10], hr: [68, 75] },
        highlight: { label: 'Sinus rhythm ปกติ ไม่มี ST change', from: -0.22, to: 0.4 },
        explain:
          'RPE ~10 ยังต่ำกว่าเป้า 11–14 และไม่มีอาการผิดปกติ HR ขึ้นน้อย (~72) เพราะ metoprolol กดการตอบสนองของ HR จึงใช้ HR เป็นเป้าไม่ได้ ต้องดู RPE แทน — เพิ่มความหนักขึ้นหนึ่งขั้นได้อย่างปลอดภัย',
        ref: `${ACSM} — exercise prescription ในผู้ป่วยที่ได้ beta-blocker (ใช้ RPE) · ${AACVPR}`,
      },
      {
        id: 'c1-s2',
        at: 560,
        question: 'จอขึ้นคลื่นถี่ยุ่งเหยิง HR บนจอ 176 และ alarm ดัง จะทำอย่างไร?',
        grades: { continue: 'best', increase: 'bad', decrease: 'ok', stop: 'ok' },
        reasons: ['artifact', 'symptom', 'hr'],
        check: { monitorHr: [170, 180], pr: [72, 82], rpe: [11, 13] },
        highlight: { label: 'QRS จริงยังเดินสม่ำเสมอทะลุคลื่นรบกวน', from: -0.05, to: 0.06 },
        explain:
          'คลื่นที่ดูคล้าย VT เป็น motion artifact: ยังเห็น QRS ปกติเดินเป็นจังหวะเดิมทะลุคลื่นรบกวน, PR จาก SpO₂ ~76 ไม่ใช่ 176 และคนไข้คุยได้ปกติ ไม่มีอาการ — ไปต่อได้ แต่ต้องดูคนไข้ คลำชีพจร และเช็ก electrode/สายที่หลวมทันที ถ้ายังไม่แน่ใจ การลดความหนักหรือหยุดสั้นๆ เพื่อเช็กสายถือว่ายอมรับได้ แต่ไม่ควรเพิ่มความหนักขณะที่ยังอ่านคลื่นไม่ได้',
        ref: `${AACVPR} — ECG monitoring ระหว่าง cardiac rehab · หลัก “treat the patient, not the monitor”`,
      },
    ],
  },

  {
    id: 'pci-st',
    title: 'เคส 2 — หลัง PCI: ST ค่อยๆ เปลี่ยน',
    chart: {
      name: 'คุณวิไล', age: 58, sex: 'หญิง', ending: 'ค่ะ', fine: 'ยังไหวค่ะ',
      dx: 'NSTEMI → PCI + DES ที่ LAD (RCA ตีบ 50–60% ยังไม่ได้ทำ)',
      postOp: '4 สัปดาห์',
      meds: ['Aspirin 81 mg', 'Clopidogrel 75 mg', 'Bisoprolol 2.5 mg', 'Atorvastatin 80 mg', 'ISDN 5 mg SL prn'],
      rest: 'HR 70 · BP 128/80 · SpO₂ 98%',
      target: 'RPE 11–13 · HR ไม่เกิน 105 (ต่ำกว่า ischemic threshold ≥ 10 bpm)',
      notes: 'Exercise test ก่อนเข้าโปรแกรม: ST ↓ 1 mm ที่ HR 115 ไม่มีอาการ',
    },
    patient: { restHR: 70, hrPerMet: 8, restSBP: 128, restDBP: 80, sbpPerMet: 9, spo2: 98, rpeBase: 7, rpePerMet: 1.6 },
    treadmill: { speed: 3.5, grade: 2 },
    endAt: 700,
    events: [
      { at: 120, ramp: 120, set: { stMm: 0.5 } },
      { at: 380, ramp: 120, set: { stMm: 2.5, hrAdd: 10, sbpAdd: -6 } },
      { at: 440, set: { symptom: 'แน่นๆ ตรงกลางหน้าอกนิดนึงค่ะ' } },
      { at: 470, set: { cues: ['sweat', 'chestClutch'] } },
    ],
    steps: [
      {
        id: 'c2-s1',
        at: 300,
        question: 'เดินช่วงคงที่มา 5 นาที คลื่นเป็นแบบที่เห็นบนจอ จะทำอย่างไร?',
        grades: { continue: 'best', increase: 'ok', decrease: 'ok', stop: 'bad' },
        reasons: ['st', 'rpe', 'symptom'],
        check: { hr: [84, 92], rpe: [10, 12] },
        highlight: { label: 'ST ต่ำลงเล็กน้อย ~0.5 mm (ไม่ถึง 1 mm)', from: 0.04, to: 0.2 },
        explain:
          'ST ต่ำลง ~0.5 mm ยังไม่ถึงเกณฑ์ที่มีนัยสำคัญ (≥ 1 mm แบบ horizontal/downsloping) RPE ~11 อยู่ในเป้า HR ~88 ต่ำกว่า limit 105 และไม่มีอาการ — ไปต่อที่ความหนักเดิมได้ แต่เฝ้าดู ST ใกล้ชิดเพราะรู้ ischemic threshold อยู่แล้ว การเพิ่มความหนักเล็กน้อยพอยอมรับได้ถ้า HR ไม่เกิน 105',
        ref: `${ACSM} — ตั้ง HR เป้าหมายให้ต่ำกว่า ischemic threshold ≥ 10 bpm`,
      },
      {
        id: 'c2-s2',
        at: 500,
        question: 'ST เปลี่ยนชัดขึ้น คนไข้บอกว่าแน่นหน้าอก จะทำอย่างไร?',
        grades: { continue: 'bad', increase: 'bad', decrease: 'ok', stop: 'best' },
        reasons: ['st', 'symptom', 'signs'],
        check: { hr: [92, 100] },
        highlight: { label: 'ST ต่ำลงแบบ horizontal ~2.5 mm', from: 0.04, to: 0.2 },
        explain:
          'ST ต่ำลงแบบ horizontal > 2 mm ร่วมกับแน่นหน้าอกและเหงื่อออก = สัญญาณ myocardial ischemia — หยุดออกกำลังกาย ให้นั่งพัก monitor EKG และวัด BP ต่อ ประเมินอาการ ให้ ISDN ตาม order ถ้าอาการไม่หาย และแจ้งแพทย์ สังเกตว่า ischemia เกิดที่ HR ~95 ต่ำกว่า threshold เดิม (115) อาจบ่งว่าโรคดำเนินไปหรือมี restenosis การลดความหนักช่วยลด demand ได้จึงพอยอมรับ แต่เมื่อมีอาการร่วมด้วยควรหยุดก่อน',
        ref: `${ACSM} — indications for terminating exercise (ST ↓ > 2 mm horizontal/downsloping, angina) · ${AACVPR}`,
      },
    ],
  },

  {
    id: 'cabg-af',
    title: 'เคส 3 — หลัง CABG: จังหวะเปลี่ยนกลางทาง',
    chart: {
      name: 'คุณประเสริฐ', age: 70, sex: 'ชาย', ending: 'ครับ', fine: 'ยังไหวครับ',
      dx: 'CABG ×2 (LIMA-LAD, SVG-PDA)',
      postOp: '3 สัปดาห์',
      meds: ['Aspirin 81 mg', 'Atorvastatin 40 mg', 'Enalapril 5 mg bid'],
      rest: 'HR 78 · BP 118/72 · SpO₂ 96%',
      target: 'RPE 11–13 · HR ไม่เกิน rest + 30 (≈ 108)',
      notes: 'ยังไม่เริ่ม beta-blocker เพราะ BP ต่ำช่วงหลังผ่าตัด · มี PVC ประปรายตั้งแต่หลังผ่าตัด',
    },
    patient: { restHR: 78, hrPerMet: 10, restSBP: 118, restDBP: 72, sbpPerMet: 8, spo2: 96, rpeBase: 9, rpePerMet: 1.8 },
    treadmill: { speed: 2.7, grade: 0 },
    endAt: 700,
    events: [
      { at: 0, set: { pvcEvery: 8 } },
      { at: 400, set: { rhythm: 'af', pvcEvery: 0 } },
      { at: 400, ramp: 40, set: { hrAdd: 62, sbpAdd: -14, rpeAdd: 3 } },
      { at: 430, set: { symptom: 'ใจสั่นๆ เหนื่อยขึ้นเยอะเลยครับ' } },
      { at: 450, set: { cues: ['sweat', 'grabRail'] } },
    ],
    steps: [
      {
        id: 'c3-s1',
        at: 240,
        question: 'มี beat หน้าตาแปลกแทรกเป็นระยะ คนไข้ไม่มีอาการ จะทำอย่างไร?',
        grades: { continue: 'best', increase: 'ok', decrease: 'ok', stop: 'bad' },
        reasons: ['rhythm', 'rpe', 'symptom'],
        check: { hr: [87, 94], rpe: [11, 12] },
        highlight: { label: 'PVC เดี่ยว: QRS กว้าง ไม่มี P นำ ตามด้วย compensatory pause', from: -0.1, to: 0.45, beatType: 'pvc' },
        explain:
          'PVC เดี่ยวรูปแบบเดียว (unifocal) ~10 ครั้ง/นาที ไม่มี couplet/triplet ไม่มีอาการ RPE ~11 อยู่ในเป้า และเป็น pattern เดิมตั้งแต่หลังผ่าตัด — ไปต่อได้พร้อมเฝ้าดู ถ้าเริ่มเป็นคู่ (couplet) หลายรูปแบบ (multifocal) หรือถี่ขึ้นตามความหนัก ให้ลดหรือหยุด',
        ref: `${ACSM} — indications for terminating exercise (multifocal PVCs, PVC triplets, VT)`,
      },
      {
        id: 'c3-s2',
        at: 480,
        question: 'จังหวะบนจอเปลี่ยนไป HR พุ่ง คนไข้บอกใจสั่น จะทำอย่างไร?',
        grades: { continue: 'bad', increase: 'bad', decrease: 'ok', stop: 'best' },
        reasons: ['rhythm', 'hr', 'symptom', 'bp'],
        check: { hr: [138, 150], sbp: [112, 120], rpe: [14, 15] },
        highlight: { label: 'ไม่มี P wave · RR ไม่สม่ำเสมอ (irregularly irregular)', from: -0.3, to: 0.05 },
        explain:
          'AF เกิดใหม่ร่วมกับ rapid ventricular response (HR ~140+) ใจสั่น เหนื่อยมากขึ้น (RPE ~14) และ SBP ลดจาก ~128 เหลือ ~116 ทั้งที่ความหนักเท่าเดิม — หยุดออกกำลังกาย ให้นั่งพัก monitor ต่อ วัด BP ประเมินอาการ (เวียนหัว เจ็บอก หายใจลำบาก) และแจ้งแพทย์ AF หลัง CABG พบบ่อยในช่วงสัปดาห์แรกๆ การลดความหนักทันทีระหว่างเตรียมหยุดยอมรับได้ แต่ไม่ควรให้ออกกำลังกายต่อจนกว่าแพทย์จะประเมิน',
        ref: `${ACSM} — indications for terminating exercise (arrhythmia ที่มีอาการ/ระบบไหลเวียนเปลี่ยน, SBP ลดลง) · ${AACVPR}`,
      },
    ],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cases.test.js`
Expected: PASS (16 tests). ถ้า `check` ข้อไหน fail → ดูค่าจริงใน error แล้วแก้ค่าเคส (เช่น `hrAdd`, `ramp`) หรือแก้ตัวเลขใน `explain` + `check` ให้ตรงกัน

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: ทุกไฟล์ PASS

- [ ] **Step 6: Commit**

```bash
git add src/cases/index.js tests/cases.test.js && git commit -m "feat: three draft clinical cases with consistency tests"
```

---

### Task 9: Monitor + strip rendering

ไม่มี unit test (canvas) — ตรวจด้วย build ตอนนี้ และตรวจด้วยตาใน Task 12

**Files:**
- Create: `src/ui/monitor.js`, `src/ui/strip.js`

- [ ] **Step 1: Write monitor**

`src/ui/monitor.js`:
```js
// Bedside-style sweep display for one lead, plus a 10 s history for the feedback strip.
// Sample k (counting from the first push) is at ECG time k / fs.
export function createMonitor(canvas, { fs = 250, seconds = 6, historySeconds = 10 } = {}) {
  const ctx = canvas.getContext('2d');
  const n = fs * seconds;
  const sweep = new Float32Array(n);
  const hist = new Float32Array(fs * historySeconds);
  const gap = Math.round(0.12 * fs); // erase bar ahead of the write head
  let total = 0;
  let beats = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    push(v) {
      sweep[total % n] = v;
      hist[total % hist.length] = v;
      total += 1;
    },

    addBeat(b) {
      beats.push(b);
      const cutoff = total / fs - historySeconds;
      while (beats.length && beats[0].time < cutoff) beats.shift();
    },

    // last `secs` seconds as { fs, samples, beats } with beat times relative to the strip start
    snapshot(secs = seconds) {
      const count = Math.min(secs * fs, total, hist.length);
      const start = total - count;
      const samples = new Float32Array(count);
      for (let i = 0; i < count; i++) samples[i] = hist[(start + i) % hist.length];
      const t0 = start / fs;
      return { fs, samples, beats: beats.filter((b) => b.time >= t0).map((b) => ({ ...b, time: b.time - t0 })) };
    },

    draw() {
      const W = canvas.width;
      const H = canvas.height;
      const pxPerMv = H / 3.2;
      ctx.fillStyle = '#05080a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#0d2416';
      ctx.lineWidth = 1;
      for (let s = 0; s <= seconds; s += 0.2) {
        const x = (s / seconds) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.strokeStyle = '#3cff6e';
      ctx.lineWidth = 2 * Math.min(window.devicePixelRatio || 1, 2);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const head = total % n;
      let pen = false;
      for (let i = 0; i < n; i++) {
        const ahead = (i - head + n) % n;
        const unwritten = total < n && i >= head;
        if (ahead < gap || unwritten) {
          pen = false;
          continue;
        }
        const x = (i / n) * W;
        const y = H / 2 - sweep[i] * pxPerMv;
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    },
  };
}
```

- [ ] **Step 2: Write strip**

`src/ui/strip.js`:
```js
// ECG paper (25 mm/s, 10 mm/mV) with highlight boxes on each matching beat.
// highlight = { from, to, beatType? } in seconds relative to the R peak.
export function drawStrip(canvas, snap, highlight) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const secs = snap.samples.length / snap.fs;
  const mm = W / (secs * 25); // px per mm

  ctx.fillStyle = '#fff7f7';
  ctx.fillRect(0, 0, W, H);
  const gridLine = (x0, y0, x1, y1, major) => {
    ctx.strokeStyle = major ? '#e9a3a3' : '#f7d4d4';
    ctx.lineWidth = major ? 1.2 : 0.6;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  for (let i = 0; i * mm <= W; i++) gridLine(i * mm, 0, i * mm, H, i % 5 === 0);
  for (let i = 0; i * mm <= H; i++) gridLine(0, i * mm, W, i * mm, i % 5 === 0);

  if (highlight) {
    ctx.fillStyle = 'rgba(255, 196, 0, 0.3)';
    for (const b of snap.beats) {
      if (highlight.beatType && b.type !== highlight.beatType) continue;
      const x0 = (b.time + highlight.from) * 25 * mm;
      const x1 = (b.time + highlight.to) * 25 * mm;
      ctx.fillRect(x0, 0, x1 - x0, H);
    }
  }

  const mid = H * 0.55;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.6 * dpr;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  snap.samples.forEach((v, i) => {
    const x = (i / snap.fs) * 25 * mm;
    const y = mid - v * 10 * mm;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
```

- [ ] **Step 3: ตรวจว่า import ได้**

Run: `node -e "import('./src/ui/strip.js').then(m => console.log(typeof m.drawStrip))"`
Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add src/ui/monitor.js src/ui/strip.js && git commit -m "feat: sweep monitor and ECG paper strip"
```

---

### Task 10: Beeper (Web Audio)

**Files:**
- Create: `src/audio/beeper.js`

- [ ] **Step 1: Write beeper**

`src/audio/beeper.js`:
```js
// QRS beep (pitch falls with SpO₂, like bedside oximeters) and a two-tone alarm. No audio files.
export function createBeeper() {
  let ctx = null;
  let muted = false;
  let alarmTimer = null;

  function tone(freq, dur, vol = 0.08, delay = 0) {
    if (muted || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  return {
    // browsers only allow audio after a user gesture: call from a click handler
    unlock() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    },
    beat(spo2) {
      tone(400 + (spo2 - 85) * 25, 0.08);
    },
    setAlarm(on) {
      if (on && !alarmTimer) {
        alarmTimer = setInterval(() => {
          tone(960, 0.15, 0.06);
          tone(760, 0.15, 0.06, 0.2);
        }, 1200);
      } else if (!on && alarmTimer) {
        clearInterval(alarmTimer);
        alarmTimer = null;
      }
    },
    setMuted(m) {
      muted = m;
    },
    get muted() {
      return muted;
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/audio/beeper.js && git commit -m "feat: QRS beep and alarm via Web Audio"
```

---

### Task 11: 3D scene (three.js)

คนหันหน้าไปทาง −x (เดินไปข้างหน้า), กล้องอยู่ด้านข้าง (z+). ข้อต่อหมุนรอบแกน z: hip ค่าลบ = ขาไปหน้า, knee ค่าบวก = งอเข่า, shoulder ค่าบวก = แขนไปหลัง

**Files:**
- Create: `src/scene/runner.js`

- [ ] **Step 1: Write the scene**

`src/scene/runner.js`:
```js
import * as THREE from 'three';

const SKIN = new THREE.Color('#e0b18f');
const SKIN_PALE = new THREE.Color('#ecdcd0');
const BELT_TOP = 0.165;
const HIP_HEIGHT = 0.95;

// A limb hangs down from its pivot (the joint at its top).
function limb(len, radius, material) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len - 2 * radius, 4, 10), material);
  mesh.position.y = -len / 2;
  pivot.add(mesh);
  return pivot;
}

function buildPerson() {
  const skin = new THREE.MeshStandardMaterial({ color: SKIN.clone(), roughness: 0.75 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#4f7cac', roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: '#37474f', roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: '#222222' });

  const root = new THREE.Group(); // origin at the hips
  const torso = new THREE.Group();
  root.add(torso);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 12), shirt);
  chest.position.y = 0.3;
  torso.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), skin);
  head.position.y = 0.72;
  torso.add(head);

  const legs = [];
  const arms = [];
  for (const side of [-1, 1]) {
    const hip = limb(0.45, 0.07, pants);
    hip.position.set(0, 0, side * 0.1);
    root.add(hip);
    const knee = limb(0.45, 0.06, pants);
    knee.position.y = -0.45;
    hip.add(knee);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.09), shoe);
    foot.position.set(-0.05, -0.47, 0);
    knee.add(foot);
    legs.push({ hip, knee });

    const shoulder = limb(0.3, 0.05, shirt);
    shoulder.position.set(0, 0.52, side * 0.23);
    torso.add(shoulder);
    const elbow = limb(0.28, 0.045, skin);
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    arms.push({ shoulder, elbow, side });
  }
  return { root, torso, legs, arms, skin };
}

function beltTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 8;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2f33';
  x.fillRect(0, 0, 128, 8);
  x.fillStyle = '#3d444b';
  x.fillRect(0, 0, 10, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 1);
  return t;
}

function buildTreadmill() {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: '#5f6b73', roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.86), frame);
  base.position.y = 0.08;
  g.add(base);
  const tex = beltTexture();
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  belt.rotation.x = -Math.PI / 2;
  belt.position.y = BELT_TOP;
  g.add(belt);
  for (const z of [-0.4, 0.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1), frame);
    post.position.set(-0.98, 0.7, z);
    g.add(post);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.9), frame);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(-0.5, 1.05, z);
    g.add(rail);
  }
  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.86), frame);
  consoleBox.position.set(-1.0, 1.25, 0);
  g.add(consoleBox);
  return { group: g, tex, beltLength: 1.8 };
}

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9eef2');
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(1.2, 1.7, 4.2);
  camera.lookAt(-0.1, 1.0, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a9aa8', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 1.4);
  sun.position.set(3, 5, 2);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: '#cfd8dc' }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const tm = buildTreadmill();
  scene.add(tm.group);
  const person = buildPerson();
  person.root.position.set(0.1, BELT_TOP + HIP_HEIGHT, 0);
  scene.add(person.root);

  new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }).observe(container);

  let phase = 0;

  return {
    update(dt, { speed, cues }) {
      const v = speed / 3.6; // m/s
      tm.tex.offset.x += ((v * dt) / tm.beltLength) * tm.tex.repeat.x;
      const strideHz = speed > 0 ? 0.75 + speed * 0.06 : 0;
      phase += 2 * Math.PI * strideHz * dt;
      const amp = speed > 0 ? Math.min(0.55, 0.18 + speed * 0.06) : 0;

      person.legs.forEach((leg, i) => {
        const ph = phase + i * Math.PI;
        leg.hip.rotation.z = -amp * Math.sin(ph);
        leg.knee.rotation.z = speed > 0 ? 0.08 + 0.75 * Math.max(0, -Math.cos(ph)) : 0;
      });

      const grab = cues.includes('grabRail');
      const clutch = cues.includes('chestClutch');
      person.arms.forEach((arm, i) => {
        const ph = phase + i * Math.PI;
        if (clutch && arm.side === 1) {
          arm.shoulder.rotation.set(0.6, 0, -1.0); // hand to the chest
          arm.elbow.rotation.z = -2.0;
        } else if (grab) {
          arm.shoulder.rotation.set(-arm.side * 0.28, 0, -0.45); // reach out to the rail
          arm.elbow.rotation.z = -0.5;
        } else {
          arm.shoulder.rotation.set(0, 0, amp * 0.7 * Math.sin(ph));
          arm.elbow.rotation.z = -0.35;
        }
      });

      person.torso.rotation.z = grab || clutch ? 0.12 : 0.04; // lean forward when distressed
      person.root.position.y = BELT_TOP + HIP_HEIGHT + 0.015 * Math.abs(Math.cos(phase));

      const sweat = cues.includes('sweat');
      person.skin.color.lerp(sweat ? SKIN_PALE : SKIN, Math.min(1, dt * 2));
      person.skin.roughness = sweat ? 0.3 : 0.75; // shiny = sweaty
    },
    render() {
      renderer.render(scene, camera);
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scene/runner.js && git commit -m "feat: three.js treadmill and walking patient with distress cues"
```

---

### Task 12: Page, screens และ game loop

**Files:**
- Create: `src/ui/screens.js`, `src/config.js`, `src/style.css`
- Modify (เขียนทับทั้งไฟล์): `index.html`, `src/main.js`

- [ ] **Step 1: config**

`src/config.js`:
```js
// Paste the Google Form link here (Task 13). The feedback button stays hidden while this is empty.
export const FEEDBACK_FORM_URL = '';
```

- [ ] **Step 2: index.html**

```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rehab Monitor Sim</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans+Thai:wght@400;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <header class="top">
      <strong>Rehab Monitor Sim</strong>
      <span class="draft-pill">ร่าง · ใช้ฝึกเท่านั้น</span>
      <button id="mute">🔊 เสียงเปิด</button>
    </header>
    <main class="layout">
      <section id="scene-wrap">
        <div id="scene"></div>
        <div id="overlay" hidden></div>
      </section>
      <section class="monitor">
        <div class="mon-head"><span>Lead II · 25 mm/s</span><span>session <span id="clock">00:00</span></span></div>
        <canvas id="ecg"></canvas>
        <div class="numerics">
          <div id="hr-box" class="num hr"><label>HR</label><b id="hr">--</b></div>
          <div class="num spo2"><label>SpO₂ · PR</label><b><span id="spo2">--</span><small>% · </small><span id="pr">--</span></b></div>
          <div class="num bp"><label>NIBP</label><b id="bp">--/--</b></div>
          <div class="num rpe"><label>RPE (ถามล่าสุด)</label><b id="rpe">--</b></div>
          <div class="num tm">
            <label>ลู่วิ่ง</label>
            <b><span id="speed">-</span><small> km/h · </small><span id="grade">-</span><small>% · </small><span id="mets">-</span><small> METs</small></b>
          </div>
        </div>
        <div id="speech" class="speech" hidden></div>
        <div class="controls">
          <button id="btn-bp">วัด BP</button>
          <button id="btn-rpe">ถาม RPE</button>
          <button id="btn-sym">ถามอาการ</button>
        </div>
      </section>
    </main>
    <div id="rotate">หมุนจอเป็นแนวนอน หรือเปิดบนคอม/แท็บเล็ต</div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 3: style.css**

`src/style.css`:
```css
:root {
  --bg: #eef2f4; --ink: #1c2529; --muted: #5d6b72; --card: #ffffff; --line: #d8e0e4;
  --accent: #2f6f8f; --best: #2e7d4f; --ok: #b7791f; --bad: #c0392b;
  --mon-bg: #05080a; --ecg: #3cff6e; --spo2: #33d6ff; --bp: #f2f2f2; --rpe: #ffd54a;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; height: 100%; }
body { font-family: 'IBM Plex Sans Thai', system-ui, sans-serif; background: var(--bg); color: var(--ink); display: flex; flex-direction: column; }
button { font: inherit; cursor: pointer; border: 1px solid var(--line); background: var(--card); color: var(--ink); border-radius: 8px; padding: 8px 14px; }
button:disabled { opacity: 0.45; cursor: default; }
button.primary, a.button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
a.button { display: inline-block; text-decoration: none; border-radius: 8px; padding: 8px 14px; }

.top { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid var(--line); background: var(--card); }
.top button { margin-left: auto; }
.draft-pill { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #fff3cd; color: #7a5b00; }

.layout { flex: 1; display: grid; grid-template-columns: 55fr 45fr; min-height: 0; }
#scene-wrap { position: relative; min-height: 0; }
#scene { position: absolute; inset: 0; }

.monitor { background: var(--mon-bg); color: #cfd8dc; display: flex; flex-direction: column; gap: 10px; padding: 12px; min-height: 0; overflow: auto; }
.mon-head { display: flex; justify-content: space-between; font: 500 13px 'IBM Plex Mono', monospace; color: #7f9aa5; }
#ecg { width: 100%; height: 34%; min-height: 150px; display: block; }
.numerics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.num { border: 1px solid #1c262b; border-radius: 6px; padding: 6px 10px; }
.num label { display: block; font-size: 12px; color: #7f9aa5; }
.num b { font: 500 30px/1.1 'IBM Plex Mono', monospace; }
.num small { font-size: 13px; color: #7f9aa5; }
.num.hr b { color: var(--ecg); }
.num.spo2 b { color: var(--spo2); }
.num.bp b { color: var(--bp); }
.num.rpe b { color: var(--rpe); }
.num.tm { grid-column: span 2; }
.num.tm b { font-size: 20px; color: #e0e0e0; }
.num.alarm { border-color: var(--bad); animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { background: #3a0d0d; } }
.speech { background: #f5f5f5; color: var(--ink); border-radius: 12px; padding: 8px 12px; font-size: 15px; }
.speech::before { content: 'คนไข้: '; font-weight: 600; }
.controls { display: flex; gap: 8px; margin-top: auto; }
.controls button { flex: 1; background: #1c262b; color: #e0e0e0; border-color: #2c3a41; }

#overlay.center { position: fixed; inset: 0; background: rgba(20, 28, 32, 0.55); display: grid; place-items: center; z-index: 10; padding: 16px; }
#overlay.sheet { position: absolute; left: 0; right: 0; bottom: 0; max-height: 100%; overflow: auto; z-index: 5; padding: 12px; }
.card { background: var(--card); border-radius: 14px; padding: 20px 24px; max-width: 640px; width: 100%; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18); max-height: calc(100vh - 32px); overflow: auto; }
#overlay.sheet .card { max-width: none; }
.card h1, .card h2, .card h3 { margin: 0 0 10px; }
.draft { background: #fff3cd; color: #7a5b00; padding: 8px 12px; border-radius: 8px; font-size: 14px; }
.cases { padding-left: 20px; }
.cases li { margin: 8px 0; }
.cases button { text-align: left; }
.tick { color: var(--best); }
.hint { color: var(--muted); font-size: 14px; }
.chart dl { display: grid; grid-template-columns: 110px 1fr; gap: 6px 12px; }
.chart dt { color: var(--muted); }
.chart dd { margin: 0; }
.actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
.actions label { border: 1px solid var(--line); border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; }
.actions label:has(input:checked) { border-color: var(--accent); background: #e6f1f6; }
.actions input { display: none; }
.sub { margin: 8px 0 4px; color: var(--muted); font-size: 14px; }
.reasons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 12px; font-size: 14px; margin-bottom: 12px; }
.tier { display: inline-block; padding: 2px 10px; border-radius: 999px; color: #fff; font-weight: 600; font-size: 14px; }
.tier.best { background: var(--best); }
.tier.ok { background: var(--ok); }
.tier.bad { background: var(--bad); }
.feedback figure { margin: 10px 0; }
#strip { width: 100%; height: 170px; display: block; border: 1px solid #e9a3a3; }
.feedback figcaption { font-size: 14px; color: #8a6d00; margin-top: 4px; }
.missed { color: var(--bad); }
.extra { color: var(--ok); }
.ref { color: var(--muted); font-size: 13px; }
.summary .score { font-size: 28px; font-weight: 600; }
.summary li { margin: 8px 0; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }

#rotate { display: none; }
@media (orientation: portrait) and (max-width: 900px) {
  #rotate { display: grid; place-items: center; position: fixed; inset: 0; background: var(--bg); z-index: 50; padding: 24px; text-align: center; font-size: 18px; }
}
```

- [ ] **Step 4: screens**

`src/ui/screens.js`:
```js
import { ACTIONS, REASONS } from '../cases/options.js';
import { drawStrip } from './strip.js';

const TIER = {
  best: { label: 'ดีที่สุด', cls: 'best' },
  ok: { label: 'ยอมรับได้', cls: 'ok' },
  bad: { label: 'ไม่ปลอดภัย / ไม่เหมาะสม', cls: 'bad' },
};
const actionLabel = (id) => ACTIONS.find((a) => a.id === id).label;
const reasonLabel = (id) => REASONS.find((r) => r.id === id).label;
const overlay = () => document.getElementById('overlay');

// 'center' = full-screen modal, 'sheet' = panel over the 3D scene only (monitor stays visible)
function open(html, mode) {
  const el = overlay();
  el.className = mode;
  el.innerHTML = html;
  el.hidden = false;
  return el;
}

export function close() {
  overlay().hidden = true;
  overlay().innerHTML = '';
}

export function showMenu(cases, done, onPick) {
  const el = open(
    `<div class="card menu">
      <h1>Rehab Monitor Sim</h1>
      <p class="draft">ร่าง — ยังไม่ได้รีวิวโดยผู้เชี่ยวชาญ · ใช้ฝึกเท่านั้น ห้ามใช้ตัดสินใจกับผู้ป่วยจริง</p>
      <p>ฝึกตัดสินใจระหว่าง exercise ใน cardiac rehab phase II: ดูคลื่นหัวใจ สัญญาณชีพ และตัวคนไข้ แล้วเลือกว่าจะไปต่อ เพิ่ม ลด หรือหยุด</p>
      <ol class="cases">${cases
        .map((c) => `<li><button data-id="${c.id}">${c.title}</button>${done.has(c.id) ? ' <span class="tick">✓</span>' : ''}</li>`)
        .join('')}</ol>
      <p class="hint">เปิดเสียงด้วย — เสียงบี๊บและ alarm เป็นส่วนหนึ่งของเคส · กดวัด BP / ถาม RPE / ถามอาการ ได้ตลอด</p>
    </div>`,
    'center',
  );
  el.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.id)));
}

export function showChart(c, onStart) {
  const ch = c.chart;
  const el = open(
    `<div class="card chart">
      <h2>${c.title}</h2>
      <dl>
        <dt>ผู้ป่วย</dt><dd>${ch.name} · ${ch.sex} ${ch.age} ปี</dd>
        <dt>Dx</dt><dd>${ch.dx}</dd>
        <dt>หลังทำหัตถการ</dt><dd>${ch.postOp}</dd>
        <dt>ยา</dt><dd>${ch.meds.join('<br>')}</dd>
        <dt>ขณะพัก</dt><dd>${ch.rest}</dd>
        <dt>เป้าหมาย</dt><dd>${ch.target}</dd>
        <dt>หมายเหตุ</dt><dd>${ch.notes}</dd>
      </dl>
      <button class="primary" id="start">เริ่ม session</button>
    </div>`,
    'center',
  );
  el.querySelector('#start').addEventListener('click', onStart);
}

export function showDecision(step, onSubmit) {
  const el = open(
    `<div class="card decision">
      <h3>${step.question}</h3>
      <div class="actions">${ACTIONS.map((a) => `<label><input type="radio" name="action" value="${a.id}"> ${a.label}</label>`).join('')}</div>
      <p class="sub">เหตุผล — ติ๊กสัญญาณที่ใช้ตัดสินใจ</p>
      <div class="reasons">${REASONS.map((r) => `<label><input type="checkbox" value="${r.id}"> ${r.label}</label>`).join('')}</div>
      <button class="primary" id="submit" disabled>ส่งคำตอบ</button>
    </div>`,
    'sheet',
  );
  const submit = el.querySelector('#submit');
  el.querySelectorAll('input[name=action]').forEach((i) => i.addEventListener('change', () => (submit.disabled = false)));
  submit.addEventListener('click', () => {
    const action = el.querySelector('input[name=action]:checked').value;
    const reasons = [...el.querySelectorAll('.reasons input:checked')].map((i) => i.value);
    onSubmit({ action, reasons });
  });
}

export function showFeedback(step, result, snap, onNext) {
  const tier = TIER[result.tier];
  const next = result.best === 'stop' ? 'จบเคส' : `ต่อ — ครูพี่เลี้ยงปรับเป็น "${actionLabel(result.best)}"`;
  const el = open(
    `<div class="card feedback">
      <span class="tier ${tier.cls}">${tier.label}</span>
      <p>คุณเลือก <b>${actionLabel(result.choice.action)}</b> · คำตอบที่ดีที่สุด <b>${actionLabel(result.best)}</b></p>
      <figure><canvas id="strip"></canvas><figcaption>${step.highlight ? step.highlight.label : ''}</figcaption></figure>
      <p>${step.explain}</p>
      ${result.missed.length ? `<p class="missed">ควรใช้แต่ไม่ได้ติ๊ก: ${result.missed.map(reasonLabel).join(', ')}</p>` : ''}
      ${result.extra.length ? `<p class="extra">ติ๊กเกินมา: ${result.extra.map(reasonLabel).join(', ')}</p>` : ''}
      <p class="ref">อ้างอิง: ${step.ref}</p>
      <button class="primary" id="next">${next}</button>
    </div>`,
    'sheet',
  );
  drawStrip(el.querySelector('#strip'), snap, step.highlight);
  el.querySelector('#next').addEventListener('click', onNext);
}

export function showSummary(c, results, { allDone, formUrl, onMenu, onReplay }) {
  const max = c.steps.length * 3;
  const points = results.reduce((s, r) => s + r.points, 0);
  const rows = c.steps
    .map((s, i) => {
      const r = results[i];
      if (!r) return '';
      const missed = r.missed.length ? ` · พลาด: ${r.missed.map(reasonLabel).join(', ')}` : '';
      return `<li><span class="tier ${TIER[r.tier].cls}">${TIER[r.tier].label}</span> ${s.question}
        <br><small>เลือก ${actionLabel(r.choice.action)} · ดีที่สุด ${actionLabel(r.best)}${missed}</small></li>`;
    })
    .join('');
  const form = allDone && formUrl ? `<a class="button primary" href="${formUrl}" target="_blank" rel="noopener">ให้ feedback (2 นาที)</a>` : '';
  const el = open(
    `<div class="card summary">
      <h2>สรุป — ${c.title}</h2>
      <p class="score">${points.toFixed(1)} / ${max} คะแนน</p>
      <ol>${rows}</ol>
      <div class="row">
        <button id="replay">เล่นเคสนี้อีกครั้ง</button>
        <button class="primary" id="menu">เลือกเคสอื่น</button>
        ${form}
      </div>
    </div>`,
    'center',
  );
  el.querySelector('#replay').addEventListener('click', onReplay);
  el.querySelector('#menu').addEventListener('click', onMenu);
}
```

- [ ] **Step 5: main.js (เขียนทับ)**

`src/main.js`:
```js
import './style.css';
import { CASES } from './cases/index.js';
import { FEEDBACK_FORM_URL } from './config.js';
import { createEngine } from './game/engine.js';
import { createEcg } from './ecg/generator.js';
import { createMonitor } from './ui/monitor.js';
import { createBeeper } from './audio/beeper.js';
import { createScene } from './scene/runner.js';
import * as screens from './ui/screens.js';

const FS = 250;
const SIM_SPEED = 6; // 1 real second = 6 session seconds (30-min session ≈ 5 min)
const IDLE_ECG = { hr: 72, rhythm: 'sinus', stMm: 0, pvcEvery: 0, artifact: 0, noise: 0.02 };

const $ = (id) => document.getElementById(id);
const monitor = createMonitor($('ecg'), { fs: FS });
const scene = createScene($('scene'));
const beeper = createBeeper();
const ecg = createEcg({ fs: FS, seed: 7 }); // one continuous signal, so monitor time never resets
const done = new Set();

let engine = null;
let shownFor = null; // engine status the overlay currently shows
let lastSymptom = null;
let speechTimer = 0;
let carry = 0;

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function say(text) {
  const el = $('speech');
  el.textContent = `“${text}”`;
  el.hidden = false;
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => (el.hidden = true), 6000);
}

function menu() {
  engine = null;
  shownFor = null;
  beeper.setAlarm(false);
  $('speech').hidden = true;
  screens.showMenu(CASES, done, (id) => pick(CASES.find((c) => c.id === id)));
}

function pick(c) {
  beeper.unlock(); // inside a click: browsers allow audio from here on
  screens.showChart(c, () => {
    screens.close();
    engine = createEngine(c);
    shownFor = 'running';
    lastSymptom = null;
    $('bp').textContent = '--/--';
    $('rpe').textContent = '--';
    $('speech').hidden = true;
  });
}

function updateHud(v) {
  const tm = engine.treadmill;
  $('hr').textContent = v.monitorHr;
  $('pr').textContent = v.pr;
  $('spo2').textContent = v.spo2;
  $('speed').textContent = tm.speed.toFixed(1);
  $('grade').textContent = tm.grade.toFixed(1);
  $('mets').textContent = tm.mets.toFixed(1);
  $('clock').textContent = fmt(engine.t);
  const alarm = v.monitorHr > 150 || v.monitorHr < 40;
  $('hr-box').classList.toggle('alarm', alarm);
  beeper.setAlarm(alarm && (engine.status === 'running' || engine.status === 'deciding'));
  if (v.symptom && v.symptom !== lastSymptom) say(v.symptom);
  lastSymptom = v.symptom;
}

function handleStatus() {
  const s = engine.status;
  if (s === shownFor) return;
  shownFor = s;
  if (s === 'running') screens.close();
  if (s === 'deciding') {
    screens.showDecision(engine.step, (choice) => {
      const result = engine.answer(choice);
      screens.showFeedback(engine.step, result, monitor.snapshot(6), () => engine.proceed());
    });
  }
  if (s === 'done') {
    beeper.setAlarm(false);
    const c = engine.caseDef;
    done.add(c.id);
    screens.showSummary(c, engine.results, {
      allDone: done.size === CASES.length,
      formUrl: FEEDBACK_FORM_URL,
      onMenu: menu,
      onReplay: () => pick(c),
    });
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (engine) engine.tick(dt * SIM_SPEED);
  const v = engine ? engine.vitals() : null;
  ecg.setParams(engine ? engine.ecgParams() : IDLE_ECG);

  carry += dt * FS;
  for (; carry >= 1; carry -= 1) monitor.push(ecg.sample());
  for (const b of ecg.drainBeats()) {
    monitor.addBeat(b);
    if (engine && engine.status !== 'done') beeper.beat(v.spo2);
  }

  if (engine) {
    updateHud(v);
    handleStatus();
  }
  const speed = engine && engine.status !== 'done' ? engine.treadmill.speed : 0;
  scene.update(dt, { speed, cues: v ? v.cues : [] });
  monitor.draw();
  scene.render();
  requestAnimationFrame(frame);
}

$('btn-bp').addEventListener('click', () => {
  if (!engine) return;
  $('bp').textContent = 'วัด…';
  setTimeout(() => {
    if (!engine) return;
    const v = engine.vitals();
    $('bp').textContent = `${v.sbp}/${v.dbp}`;
  }, 3000); // a cuff reading takes time
});
$('btn-rpe').addEventListener('click', () => {
  if (!engine) return;
  const v = engine.vitals();
  $('rpe').textContent = v.rpe;
  say(`เหนื่อยประมาณ ${v.rpe} ${engine.caseDef.chart.ending}`);
});
$('btn-sym').addEventListener('click', () => {
  if (!engine) return;
  say(engine.vitals().symptom ?? engine.caseDef.chart.fine);
});
$('mute').addEventListener('click', () => {
  beeper.setMuted(!beeper.muted);
  $('mute').textContent = beeper.muted ? '🔇 เสียงปิด' : '🔊 เสียงเปิด';
});

menu();
requestAnimationFrame(frame);
```

- [ ] **Step 6: Build + test**

Run: `npm test && npm run build`
Expected: tests PASS, build `✓ built`

- [ ] **Step 7: เล่นจริงในเบราว์เซอร์**

เปิด dev server (preview_start name `dev`) แล้วเล่นครบ 3 เคส ตรวจตามนี้:
- เมนูขึ้น, มีป้าย "ร่าง", คลื่น sinus วิ่งบนจอดำระหว่างอยู่เมนู
- เปิดเคส → chart → เริ่ม → คนเดินบนลู่, สายพานเลื่อนไปทางหลังคน (ถ้ากลับทิศ: เปลี่ยน `+=` เป็น `-=` ที่ `tm.tex.offset.x`), ขาไปหน้าตรงกับทิศหัน (ถ้ากลับ: สลับเครื่องหมายใน `leg.hip.rotation.z`)
- มีเสียงบี๊บตาม QRS, ปุ่มปิดเสียงทำงาน
- วัด BP ขึ้น "วัด…" 3 วิแล้วได้ค่า, ถาม RPE / ถามอาการ มีคำพูดคนไข้
- เคส 1: จุด 1 คลื่นปกติ · จุด 2 artifact + HR 176 + alarm กะพริบ แต่ PR ~76
- เคส 2: ST ต่ำลงเห็นชัดตอนจุด 2, คนไข้กุมอก หน้าซีด/มันวาว
- เคส 3: PVC กว้างแทรกทุก ~8 beat · จุด 2 AF ไม่มี P, RR ไม่สม่ำเสมอ, จับราว
- หน้า feedback: strip กระดาษชมพู มีกล่องเหลืองตรงจุดที่ควรดู (เคส 3 จุด 1 กล่องเฉพาะ PVC)
- หน้าสรุปคะแนน, เล่นซ้ำ / กลับเมนู ทำงาน, มีเครื่องหมาย ✓ ที่เคสที่เล่นแล้ว
- หมุนจอเป็นแนวตั้ง (resize เป็น mobile) → ขึ้นข้อความให้หมุนจอ
- console ไม่มี error
ปรับท่าทาง (chestClutch / grabRail) ด้วยตาจนดูเป็นธรรมชาติ

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: playable page with screens, HUD, and game loop"
```

---

### Task 13: Deploy + Google Form

**ต้องได้ OK จากผู้ใช้ก่อน Step 3** (สร้าง repo public = เผยแพร่ต่อสาธารณะ)

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `src/config.js`

- [ ] **Step 1: Workflow**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github && git commit -m "ci: deploy to GitHub Pages"
```

- [ ] **Step 3: สร้าง repo + เปิด Pages (หลังผู้ใช้ OK)**

```bash
gh repo create ekg-rehab-sim --public --source . --remote origin --push
```
```bash
gh api -X POST "repos/{owner}/{repo}/pages" -f build_type=workflow
```
```bash
gh workflow run deploy.yml && gh run list --limit 1
```
Expected: run สถานะ `completed success` ภายในไม่กี่นาที; ลิงก์ = `https://napphattua.github.io/ekg-rehab-sim/`

- [ ] **Step 4: เปิดลิงก์จริงในเบราว์เซอร์ เล่นเคส 1 ให้จบ 1 รอบ** (ตรวจว่า asset path ใต้ `/ekg-rehab-sim/` โหลดได้)

- [ ] **Step 5: Google Form (ผู้ใช้ทำ)** — คำถาม:
1. คุณเป็น: นักศึกษา PT / PT จบใหม่ / PT cardio / อื่นๆ
2. ความสมจริงของแต่ละเคส (1–5) × 3
3. มีจุดไหนที่ผิดหลักคลินิก หรือเฉลยไม่เห็นด้วย (ข้อความ)
4. อยากได้เคสแบบไหนเพิ่ม (ข้อความ)
5. จะใช้ไหมถ้ามีครบ 20 เคส (ใช่ / อาจจะ / ไม่)

- [ ] **Step 6: ใส่ลิงก์ฟอร์ม แล้ว deploy**

แก้ `src/config.js`:
```js
export const FEEDBACK_FORM_URL = 'https://forms.gle/<ลิงก์จากผู้ใช้>';
```
```bash
git commit -am "feat: link feedback form" && git push
```

---

## หลังจบแผนนี้ (ยังไม่อยู่ในขอบเขต)
- UI polish ด้วย skill `impeccable` หลังได้ feedback รอบแรก
- โหมดยาก: real-time ไม่หยุดให้ตัดสิน
- 3 ลีด, โมเดลคนจาก Mixamo, เคสเพิ่ม (HF, valve, hypotensive response, VT จริง)
- Cardiologist review → ปักหมุด edition/หน้าของทุก `ref`
