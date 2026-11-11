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
