"use client";

import {
  formatLocalTime,
  isTripEventKind,
  nextTripStep,
  TRIP_EVENT_KINDS,
  TRIP_EVENT_LABELS,
  TRIP_EVENT_NOTE_MAX_LENGTH,
  waitingMinutes,
} from "@repo/db";
import type { FulfilmentTrip } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { Card, CardTitle } from "@repo/console/Card";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "@repo/console/use-action-form";
import { reportForDriverAction } from "./fulfil-actions";

type Event = {
  id: string;
  itemId: string;
  kind: string;
  at: Date;
  note: string | null;
};

/**
 * On the day: each trip's taps from its driver in Connect, or from
 * Operation for them, with the waiting they measure (arrived to on
 * board). Operation can tap for a driver who cannot. See
 * docs/261028-fulfilment-vendors-and-connect.md, "On the day".
 */
export function TripReports({
  bookingId,
  trips,
  events,
  canFulfil,
}: {
  bookingId: string;
  trips: FulfilmentTrip[];
  events: Event[];
  canFulfil: boolean;
}) {
  const shown = trips.filter(
    (trip) =>
      events.some((e) => e.itemId === trip.id) ||
      (canFulfil && trip.parts.length > 0 && trip.status !== "cancelled"),
  );
  if (shown.length === 0) return null;
  return (
    <Card className="grid gap-4">
      <CardTitle description="What each driver reported on the day.">
        On the day
      </CardTitle>
      {shown.map((trip) => {
        const own = events.filter((e) => e.itemId === trip.id);
        const waited = waitingMinutes(own);
        return (
          <div key={trip.id} className="grid gap-2">
            <p className="text-sm font-medium">Trip {trip.position}</p>
            {own.length > 0 ? (
              <ul className="grid gap-1 text-sm text-slate-700">
                {own.map((event) => (
                  <li key={event.id}>
                    <span className="tabular-nums">
                      {formatLocalTime(event.at)}
                    </span>{" "}
                    {isTripEventKind(event.kind)
                      ? TRIP_EVENT_LABELS[event.kind]
                      : event.kind}
                    {event.note ? (
                      <span className="text-slate-500"> · {event.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No report yet.</p>
            )}
            {waited !== null ? (
              <p className="text-sm text-slate-600">
                Waited {waited} min for the passenger.
              </p>
            ) : null}
            {canFulfil &&
            trip.status !== "cancelled" &&
            trip.status !== "completed" ? (
              <ReportForm
                bookingId={bookingId}
                itemId={trip.id}
                next={nextTripStep(own)}
              />
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}

/** "Report for the driver": a kind, a note, sent now. */
function ReportForm({
  bookingId,
  itemId,
  next,
}: {
  bookingId: string;
  itemId: string;
  next: string | null;
}) {
  const { pending, error, formProps } = useActionForm(reportForDriverAction, {
    done: "Report saved.",
    reset: true,
  });
  return (
    <form
      {...formProps}
      className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="itemId" value={itemId} />
      <Field label="Report for the driver">
        <Select
          name="kind"
          required
          defaultValue={next ?? "problem"}
          options={TRIP_EVENT_KINDS.map((kind) => ({
            value: kind,
            label: TRIP_EVENT_LABELS[kind],
          }))}
        />
      </Field>
      <Field label="Note">
        <Input
          name="note"
          maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
          autoComplete="off"
          placeholder="Optional; needed for a problem"
        />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <FormError error={error} />
    </form>
  );
}
