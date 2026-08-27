export type DriftStatus =
  | "IMPROVED_SIGNIFICANTLY"
  | "DEGRADED_SIGNIFICANTLY"
  | "STABLE"
  | "CONSISTENT_TOPPER";

export interface StandardizedResult {
  totalMarks: number;
  percentage: number;
  percentile: number;
  zScore: number;
  campusRank: number;
}

/** Compute percentile, z-score, campus rank for all results in an assessment. */
export function standardizeAssessment(
  rows: { studentId: string; totalMarks: number; maxMarks: number }[]
): Map<string, StandardizedResult> {
  const sorted = [...rows].sort((a, b) => b.totalMarks - a.totalMarks);
  const n = sorted.length;
  const map = new Map<string, StandardizedResult>();
  if (n === 0) return map;

  const mean = sorted.reduce((s, r) => s + r.totalMarks, 0) / n;
  const variance = sorted.reduce((s, r) => s + (r.totalMarks - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance) || 1;

  sorted.forEach((row, idx) => {
    const below = sorted.filter((r) => r.totalMarks < row.totalMarks).length;
    const equal = sorted.filter((r) => r.totalMarks === row.totalMarks).length - 1;
    const percentile = n === 1 ? 100 : ((below + 0.5 * equal) / (n - 1)) * 100;

    map.set(row.studentId, {
      totalMarks: row.totalMarks,
      percentage: Number(((row.totalMarks / row.maxMarks) * 100).toFixed(2)),
      percentile: Number(percentile.toFixed(2)),
      zScore: Number(((row.totalMarks - mean) / stddev).toFixed(3)),
      campusRank: idx + 1,
    });
  });
  return map;
}

/** Classify drift status from previous & current percentile. */
export function classifyDrift(
  prevPercentile: number,
  currPercentile: number,
  recentPercentiles: number[]
): DriftStatus {
  const delta = currPercentile - prevPercentile;
  if (recentPercentiles.length >= 3 && recentPercentiles.every((p) => p >= 90)) {
    return "CONSISTENT_TOPPER";
  }
  if (delta >= 15) return "IMPROVED_SIGNIFICANTLY";
  if (delta <= -15) return "DEGRADED_SIGNIFICANTLY";
  return "STABLE";
}

/** Rolling average over a window of the last N values. */
export function rollingAverage(values: number[], window: number): number | null {
  if (values.length < window) return null;
  const slice = values.slice(-window);
  return Number((slice.reduce((s, v) => s + v, 0) / window).toFixed(2));
}

/** Velocity = % change between last two values. */
export function computeVelocity(values: number[]): number | null {
  if (values.length < 2) return null;
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  if (prev === 0) return null;
  return Number((((last - prev) / prev) * 100).toFixed(2));
}

export const SUBJECTS_BY_STREAM: Record<string, string[]> = {
  JEE: ["Physics", "Chemistry", "Mathematics"],
  NEET: ["Physics", "Chemistry", "Biology"],
};