import { cx } from "@repo/ui/cx";
import { dayKey } from "../_lib/when";
import { Panel } from "./parts";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Kuala_Lumpur";
const weekday = new Intl.DateTimeFormat("en-MY", {
  timeZone: TIME_ZONE,
  weekday: "narrow",
});
const dayOfMonth = new Intl.DateTimeFormat("en-MY", {
  timeZone: TIME_ZONE,
  day: "numeric",
});

/**
 * The next seven days at a glance, for the large screen's side column:
 * each day with how many trips it holds, today ringed.
 */
export function WeekAhead({
  trips,
  now,
}: {
  trips: { startsAt: Date }[];
  now: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const at = new Date(now.getTime() + i * DAY_MS);
    const key = dayKey(at);
    return {
      key,
      weekday: weekday.format(at),
      day: dayOfMonth.format(at),
      count: trips.filter((t) => dayKey(t.startsAt) === key).length,
    };
  });
  const total = days.reduce((sum, d) => sum + d.count, 0);
  return (
    <Panel className="hidden gap-4 p-5 lg:grid">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-ink">Next 7 days</h2>
        <span className="text-xs font-semibold text-slate-500">
          {total} {total === 1 ? "trip" : "trips"}
        </span>
      </div>
      <ol className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((d, i) => (
          <li
            key={d.key}
            className={cx(
              "grid gap-1 rounded-2xl py-2.5",
              d.count > 0 ? "bg-brand-tint" : "bg-slate-50",
              i === 0 && "ring-2 ring-brand",
            )}
          >
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase">
              {d.weekday}
            </span>
            <span className="text-sm font-bold text-ink tabular-nums">
              {d.day}
            </span>
            <span
              className={cx(
                "mx-auto grid size-5 place-items-center rounded-full text-[0.65rem] font-bold tabular-nums",
                d.count > 0 ? "bg-brand text-white" : "text-transparent",
              )}
            >
              {d.count}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
