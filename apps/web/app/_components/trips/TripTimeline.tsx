import type { ReactNode } from "react";
import { PencilIcon } from "@repo/ui/icons";
import { byStart, clashesOf } from "@repo/db";
import {
  clashLabel,
  routeOf,
  whenOf,
  type PlannedTrip,
} from "../../_lib/trip-plan";

/** A line under a trip in the list: why it cannot be booked, or what to know about it. */
export type TripNote = { tone: "red" | "blue"; text: ReactNode };

const NOTE_TONES: Record<TripNote["tone"], string> = {
  red: "text-danger",
  blue: "text-navy",
};

export function TripNumber({
  value,
  small = false,
}: {
  value: number;
  small?: boolean;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-brand font-bold text-white ${
        small ? "size-[22px] text-2xs" : "size-6 text-xs"
      }`}
    >
      {value}
    </span>
  );
}

/**
 * "Your trips": the trips by start, numbered as they are booked and
 * priced, each with its price and what the page needs to say about it. A
 * trip that starts with another or during a hire says so in place of its
 * route. With `onPick` a trip opens in the form; without, the list only
 * shows them, as on the confirm page. On a wide list a route is cut to
 * one line, unless `fullRoutes`, as where the booking is confirmed.
 */
export function TripTimeline({
  trips,
  open = null,
  onPick,
  priceOf,
  noteOf,
  action,
  fullRoutes = false,
  focusRing = "focus-ring",
  className = "mb-5",
}: {
  trips: readonly PlannedTrip[];
  /** The trip open in the form. */
  open?: string | null;
  onPick?: (id: string) => void;
  priceOf?: (trip: PlannedTrip) => ReactNode;
  noteOf?: (trip: PlannedTrip) => TripNote | null;
  /** Beside the list's title, such as a link to change the trips. */
  action?: ReactNode;
  /** Every route in full, wrapping, never cut. */
  fullRoutes?: boolean;
  /** The keyboard's ring on a trip: `focus-ring-inset` inside a box that scrolls, which would clip it. */
  focusRing?: string;
  className?: string;
}) {
  const sorted = byStart(trips);
  const clashes = clashesOf(sorted);

  return (
    <div
      className={`@container rounded-2xl bg-mist p-2.5 sm:p-3.5 ${className}`}
    >
      <div className="mx-1 mb-2 flex flex-wrap items-baseline gap-x-2.5 text-copy">
        <b className="text-ink">Your trips</b>
        {onPick ? (
          <span className="text-muted">Choose one to change it</span>
        ) : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      <ol className="grid gap-1.5">
        {sorted.map((trip, index) => {
          const isOpen = trip.id === open;
          const clash = clashes.get(trip.id);
          const problem = !isOpen && clash ? clashLabel(clash.kind) : null;
          const note = isOpen ? null : (noteOf?.(trip) ?? null);
          const red = problem !== null || note?.tone === "red";
          const look = `flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm leading-snug ${
            isOpen
              ? "border-brand bg-brand-tint"
              : red
                ? "border-danger bg-white"
                : "border-card-edge bg-white"
          }`;
          const body = (
            <>
              <TripNumber value={index + 1} small />
              <span className="grid min-w-0 flex-1 gap-x-4 @xl:grid-cols-[170px_minmax(0,1fr)] @xl:items-center">
                <b className="text-ink">{whenOf(trip)}</b>
                <span
                  className={`min-w-0 ${fullRoutes ? "" : "@xl:truncate"} ${
                    problem ? "text-danger" : "text-muted"
                  }`}
                >
                  {problem ?? routeOf(trip)}
                </span>
                {note ? (
                  <span
                    className={`col-span-full mt-1 text-caption ${NOTE_TONES[note.tone]}`}
                  >
                    {note.text}
                  </span>
                ) : null}
              </span>
              {priceOf ? (
                <span className="shrink-0 font-semibold text-ink">
                  {priceOf(trip)}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={trip.id}>
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(trip.id)}
                  aria-current={isOpen ? "true" : undefined}
                  className={`${look} ${isOpen || red ? "" : "hover:border-brand/50"} ${focusRing}`}
                >
                  {body}
                  {isOpen ? null : (
                    <PencilIcon className="size-3.5 shrink-0 text-muted" />
                  )}
                </button>
              ) : (
                <div className={look}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
