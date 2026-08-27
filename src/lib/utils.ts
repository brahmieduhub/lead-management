export function cn(...inputs: (string | false | null | undefined)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "\u2014";
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || isNaN(value)) return "\u2014";
  return value.toFixed(digits);
}

export function formatZScore(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "\u2014";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}σ`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getDriftColor(status: string): string {
  switch (status) {
    case "IMPROVED_SIGNIFICANTLY":
      return "bg-green-100 text-green-800";
    case "DEGRADED_SIGNIFICANTLY":
      return "bg-red-100 text-red-800";
    case "CONSISTENT_TOPPER":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function getDriftLabel(status: string): string {
  switch (status) {
    case "IMPROVED_SIGNIFICANTLY":
      return "Improved Significantly";
    case "DEGRADED_SIGNIFICANTLY":
      return "Degraded Significantly";
    case "CONSISTENT_TOPPER":
      return "Consistent Topper";
    default:
      return "Stable";
  }
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "EASY":
      return "bg-green-100 text-green-800";
    case "MODERATE":
      return "bg-yellow-100 text-yellow-800";
    case "DIFFICULT":
      return "bg-red-100 text-red-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}