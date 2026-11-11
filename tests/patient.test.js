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
