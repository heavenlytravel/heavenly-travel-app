import { formatLocalTime } from "@repo/db";

/**
 * How Connect says when: the day as a driver says it ("Today",
 * "Tomorrow", "Fri, 31 Oct"), the time split for a large clock, and how
 * long until. Always in Malaysia, wherever the phone or the server is.
 * Browser-safe.
 */

const TIME_ZONE = "Asia/Kuala_Lumpur";
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const shortDay = new Intl.DateTimeFormat("en-MY", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const longDay = new Intl.DateTimeFormat("en-MY", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** The Malaysian day an instant falls in, "2026-10-31": for grouping. */
export function dayKey(instant: Date) {
  return dayKeyFormat.format(instant);
}

/** "Today", "Tomorrow", "Yesterday", else "Fri, 31 Oct". */
export function dayLabel(instant: Date, now: Date) {
  const key = dayKey(instant);
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(new Date(now.getTime() + DAY_MS))) return "Tomorrow";
  if (key === dayKey(new Date(now.getTime() - DAY_MS))) return "Yesterday";
  return shortDay.format(instant);
}

/** "Wednesday, 29 October": the day at the top of the screen. */
export function longDayLabel(instant: Date) {
  return longDay.format(instant);
}

/** "9:30 AM" as its clock and its half of the day, for a large time. */
export function clockOf(instant: Date) {
  const [clock = "", period = ""] = formatLocalTime(instant).split(" ");
  return { clock, period };
}

/** "Good morning" by the hour in Malaysia. */
export function greetingAt(now: Date) {
  const hour = Number(hourFormat.format(now));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "in 1 h 20 min", "in 3 days", "now", "40 min ago". */
export function untilLabel(at: Date, now: Date) {
  const minutes = Math.round((at.getTime() - now.getTime()) / MINUTE_MS);
  const ago = minutes < 0;
  const span = Math.abs(minutes);
  if (span < 1) return "now";
  let text: string;
  if (span < 60) text = `${span} min`;
  else if (span < 24 * 60) {
    const hours = Math.floor(span / 60);
    const rest = span % 60;
    text = rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
  } else {
    const days = Math.round(span / (24 * 60));
    text = days === 1 ? "1 day" : `${days} days`;
  }
  return ago ? `${text} ago` : `in ${text}`;
}

/** Items grouped by their Malaysian day, in the order given. */
export function byDay<T>(items: readonly T[], instantOf: (item: T) => Date) {
  const groups = new Map<string, { at: Date; items: T[] }>();
  for (const item of items) {
    const at = instantOf(item);
    const key = dayKey(at);
    const group = groups.get(key) ?? { at, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}
