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
