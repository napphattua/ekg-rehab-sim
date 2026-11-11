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
