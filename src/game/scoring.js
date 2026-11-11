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
