import {
  formatLocalTime,
  isTripEventKind,
  TRIP_EVENT_LABELS,
  TRIP_STEPS,
} from "@repo/db";
import { cx } from "@repo/ui/cx";
import { Check, CloudOff, TriangleAlert, UserX } from "lucide-react";

export type TimelineEvent = {
  key: string;
  kind: string;
  at: Date;
  note: string | null;
  /** Still on the phone, waiting for signal. */
  sent: boolean;
};

/**
 * The trip's four steps top to bottom, each ticked with its time once
 * tapped, the next one lit; a no-show or a problem stands under them with
 * its note. The driver sees it over their buttons, the vendor alone.
 */
export function TripTimeline({
  events,
  next,
}: {
  events: TimelineEvent[];
  /** The step to tap next, lit; null when the trip is over. */
  next: string | null;
}) {
  const extra = events.filter(
    (e) => !(TRIP_STEPS as readonly string[]).includes(e.kind),
  );
  return (
    <div className="grid gap-4">
      <ol className="grid">
        {TRIP_STEPS.map((step, index) => {
          const event = events.find((e) => e.kind === step);
          const current = step === next;
          const last = index === TRIP_STEPS.length - 1;
          return (
            <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
              {last ? null : (
                <span
                  aria-hidden
                  className={cx(
                    "absolute top-8 bottom-0 left-[0.9375rem] w-0.5",
                    event ? "bg-success-dot" : "bg-card-edge",
                  )}
                />
              )}
              <span
                className={cx(
                  "relative grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                  event
                    ? event.sent
                      ? "bg-success text-white"
                      : "bg-warning-soft text-warning"
                    : current
                      ? "bg-brand text-white ring-4 ring-brand-tint"
                      : "bg-hairline text-muted",
                )}
              >
                {event ? (
                  event.sent ? (
                    <Check aria-hidden className="size-4" strokeWidth={3} />
                  ) : (
                    <CloudOff aria-hidden className="size-4" />
                  )
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-1">
                <span className="grid gap-0.5">
                  <span
                    className={cx(
                      "font-semibold",
                      event || current ? "text-ink" : "text-muted",
                    )}
                  >
                    {TRIP_EVENT_LABELS[step]}
                  </span>
                  {event?.note ? (
                    <span className="text-sm text-muted">{event.note}</span>
                  ) : null}
                  {event && !event.sent ? (
                    <span className="text-xs font-semibold text-warning">
                      Waiting for signal, sends by itself
                    </span>
                  ) : null}
                </span>
                {event ? (
                  <span className="text-sm font-semibold text-muted tabular-nums">
                    {formatLocalTime(event.at)}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {extra.length > 0 ? (
        <ul className="grid gap-2">
          {extra.map((event) => {
            const Icon = event.kind === "no-show" ? UserX : TriangleAlert;
            return (
              <li
                key={event.key}
                className="flex gap-3 rounded-control border border-danger-edge bg-danger-tint p-3 text-sm"
              >
                <Icon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-danger"
                />
                <span className="grid flex-1 gap-0.5">
                  <span className="flex justify-between gap-2 font-semibold text-danger-strong">
                    {isTripEventKind(event.kind)
                      ? TRIP_EVENT_LABELS[event.kind]
                      : event.kind}
                    <span className="font-medium text-danger tabular-nums">
                      {formatLocalTime(event.at)}
                    </span>
                  </span>
                  {event.note ? (
                    <span className="text-danger">{event.note}</span>
                  ) : null}
                  {event.sent ? null : (
                    <span className="text-xs font-semibold text-warning">
                      Waiting for signal, sends by itself
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
