export const RANGES = [
  { id: "day", label: "Today", blurb: "Brand-new repos from the last day with the most stars." },
  { id: "week", label: "This week", blurb: "Brand-new repos from the last week with the most stars." },
  { id: "month", label: "This month", blurb: "Brand-new repos from the last month with the most stars." },
  { id: "all", label: "All time", blurb: "The most-starred repos on GitHub, ever." },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];

export const isRange = (v: string | null | undefined): v is RangeId => RANGES.some((r) => r.id === v);

const DAYS: Record<Exclude<RangeId, "all">, number> = { day: 1, week: 7, month: 30 };

/** The GitHub search query for a range. New ranges look at repos created in the window; all-time ignores age. */
export function trendingQuery(range: RangeId): string {
  if (range === "all") return "stars:>10000";
  const since = new Date(Date.now() - DAYS[range] * 864e5).toISOString().slice(0, 10);
  return `created:>${since}`;
}
