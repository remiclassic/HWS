/**
 * Result confidence: max over attributions of (confidence_score * trust_weight),
 * capped at 1. Official sources typically have higher trust_weight in seed data.
 */
export function aggregateConfidence(
  scores: readonly { confidenceScore: number; trustWeight: number }[],
): number {
  if (scores.length === 0) return 0.5;
  let max = 0;
  for (const s of scores) {
    const v = Math.min(1, s.confidenceScore * s.trustWeight);
    if (v > max) max = v;
  }
  return Math.round(max * 1000) / 1000;
}
