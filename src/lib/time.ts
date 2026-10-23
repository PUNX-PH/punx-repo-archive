/** Short relative time like "Today", "3d ago", "2mo ago", "1y ago". Returns "-" for missing or bad dates. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "-";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (Number.isNaN(days)) return "-";
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
