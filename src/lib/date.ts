// Lightweight date utilities. Datetimes are stored as "YYYY-MM-DDTHH:mm" local strings.

const PAD = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}T${PAD(
    d.getHours(),
  )}:${PAD(d.getMinutes())}`;
}

export function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return `${date.getFullYear()}-${PAD(date.getMonth() + 1)}-${PAD(date.getDate())}`;
}

export function parseISO(s: string): Date {
  const [datePart, timePart] = s.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h = 0, min = 0] = (timePart ?? "0:0").split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, h, min);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addHours(d: Date, n: number): Date {
  const r = new Date(d);
  r.setHours(r.getHours() + n);
  return r;
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const diff = (r.getDay() + 6) % 7; // Monday-based
  return addDays(r, -diff);
}

export function endOfDay(d: Date): Date {
  const r = startOfDay(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function sameDay(a: Date | string, b: Date | string): boolean {
  return dayKey(a) === dayKey(b);
}

export function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return `${PAD(date.getHours())}:${PAD(date.getMinutes())}`;
}

export function formatDateShort(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return `${PAD(date.getMonth() + 1)}/${PAD(date.getDate())}`;
}

const WD = ["日", "一", "二", "三", "四", "五", "六"];
export function weekdayCN(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return `周${WD[date.getDay()]}`;
}

export function formatDateTimeCN(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayCN(date)} ${formatTime(date)}`;
}

export function hoursBetween(start: string, end: string): number {
  return (parseISO(end).getTime() - parseISO(start).getTime()) / 3_600_000;
}

export function nowISO(): string {
  return toISO(new Date());
}

export function isBefore(a: string, b: string): boolean {
  return parseISO(a).getTime() < parseISO(b).getTime();
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return parseISO(aStart) < parseISO(bEnd) && parseISO(bStart) < parseISO(aEnd);
}

export function rangeLabel(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function relativeDay(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  if (diff > 1 && diff < 7) return `${diff}天后`;
  return formatDateShort(date);
}
