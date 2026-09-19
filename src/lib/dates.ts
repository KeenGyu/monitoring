export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function addMonths(key: string, count: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + count, 1);
  return monthKey(d);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function monthsBetween(startKey: string, endKey: string): string[] {
  const months: string[] = [];
  let cursor = startKey;
  let guard = 0;
  while (guard < 36) {
    months.push(cursor);
    if (cursor === endKey) break;
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  return months;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return "\u2014";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  const datePart = d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} \u2014 ${timePart}`;
}

export function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(then.toString().slice(0, 10));
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

export function isPastDue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return dueDate < todayIso();
}

export function daysUntil(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  const today = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.round((due - today) / 86400000);
}