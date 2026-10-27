"use client";

import { useState } from "react";
import { PassengersField, SendButton, type CardProps } from "./parts";
import { startOf, TripForm, TripTimeline, usePlanner } from "./Planner";
import { sendLabel } from "./rules";

/**
 * The home page's one-row card with the trip planner: one trip is typed
 * and priced as today; "Add trip" puts it in the list above, by date, and
 * empties the form for the next. Getting prices sends
 * the list with the trip in the form, when one is typed. Passengers are
 * asked once, beside the button, for the one vehicle that does every trip.
 */
export function SearchCard({ seed, seedOpen, priced, onSend }: CardProps) {
  const [start] = useState(() => startOf(seed, seedOpen));
  const [rows, setRows] = useState(start.rows);
  const planner = usePlanner({
    rows,
    onRows: setRows,
    initial: start.form,
    keepOpen: true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = planner.collect();
    if (next) onSend(next);
  }

  return (
    <form onSubmit={submit} noValidate className="px-3.5 py-[18px] sm:p-6">
      {rows.length > 0 ? (
        <TripTimeline
          rows={rows}
          open={planner.editing}
          issues={planner.issues}
          onPick={planner.open}
        />
      ) : null}
      <TripForm planner={planner}>
        <span className="hidden flex-1 lg:block" />
        <PassengersField />
        <SendButton label={sendLabel(planner.count, priced)} />
      </TripForm>
    </form>
  );
}
