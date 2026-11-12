"use client";

import {
  formatLocalTime,
  isTripEventKind,
  nextTripStep,
  noShowRefusal,
  noShowUndoRefusal,
  TRIP_EVENT_LABELS,
  TRIP_EVENT_NOTE_MAX_LENGTH,
  TRIP_STEPS,
  type TripEventKind,
} from "@repo/db";
import type { FulfilmentTrip } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Field, Input, Textarea } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { CheckIcon } from "@repo/ui/icons";
import { useState } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { useActionForm } from "@repo/console/use-action-form";
import { reportForDriverAction, undoNoShowAction } from "./actions";

type Event = {
  id: string;
  itemId: string;
  kind: string;
  at: Date;
  note: string | null;
  /** When the server received it: a no-show's hour runs from here. */
  createdAt: Date;
};

/**
 * On the day: each trip's four steps in a line (On the way, Arrived at
 * pickup, Passenger on board, Dropped off), each ticked with its time once
 * reported, the next one ringed; a no-show or a problem under them with
 * its note; the waiting they measure. Operation can report for a driver
 * who cannot, in the same order as Connect: only the next step, or a
 * no-show, or a problem. See docs/261028-fulfilment-vendors-and-connect.md,
 * "On the day".
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
    <Card>
      <CardTitle description="What the driver reported on the day.">
        On the day
      </CardTitle>
      <div className="grid gap-6">
        {shown.map((trip) => (
          <div key={trip.id} className="grid gap-4">
            {trips.length > 1 ? (
              <p className="text-sm font-medium text-ink">
                Trip {trip.position}
              </p>
            ) : null}
            <TripDay
              bookingId={bookingId}
              trip={trip}
              events={events.filter((e) => e.itemId === trip.id)}
              canFulfil={canFulfil}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * One trip's day: its two steps, Arrived and Dropped off, a no-show and
 * its reason (or a problem, from before), and for Operation the way to
 * report for the driver, or to take a no-show back when the passenger
 * came after all. Inside a card of
 * its own (`TripReports`) or the trip's card on the booking.
 */
export function TripDay({
  bookingId,
  trip,
  events,
  canFulfil,
}: {
  bookingId: string;
  trip: Pick<FulfilmentTrip, "id" | "status" | "startsAt">;
  /** The trip's own events. */
  events: Event[];
  canFulfil: boolean;
}) {
  const next = nextTripStep(events);
  const open =
    next !== null && trip.status !== "cancelled" && trip.status !== "completed";
  const undoable =
    canFulfil &&
    trip.status !== "cancelled" &&
    noShowUndoRefusal(events, "admin") === null;
  return (
    <div className="grid gap-4">
      <StepLine events={events} next={open ? next : null} />
      <Extras events={events} />
      {canFulfil && open ? (
        <ReportFor
          bookingId={bookingId}
          itemId={trip.id}
          next={next}
          noShowWait={noShowRefusal(events, trip.startsAt)}
        />
      ) : null}
      {undoable ? <UndoNoShow itemId={trip.id} /> : null}
    </div>
  );
}

/** Takes the no-show back: the trip is open again, for the driver to report Dropped off. */
function UndoNoShow({ itemId }: { itemId: string }) {
  const undo = useActionForm(undoNoShowAction, {
    done: "No-show taken back: the trip is open again.",
  });
  return (
    <form
      {...undo.formProps}
      className="grid gap-2 rounded-control border border-card-edge bg-shade p-3"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <p className="text-caption text-muted">
        The passenger came after all? Take the no-show back, and the driver
        reports Dropped off at the end. After its hour the trip is completed and
        billed; taking it back then reopens the trip, and the bill stays.
      </p>
      <div>
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          pending={undo.pending}
        >
          Undo no-show
        </Button>
      </div>
      <FormError error={undo.error} size="xs" />
    </form>
  );
}

/**
 * The steps in a line, ticked
 * with the time once reported, the next one ringed, the rest grey.
 */
function StepLine({
  events,
  next,
}: {
  events: readonly Event[];
  next: TripEventKind | null;
}) {
  return (
    <ol
      aria-label="Driver's steps"
      className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-2"
    >
      {TRIP_STEPS.map((step, index) => {
        const event = events.find((e) => e.kind === step);
        const current = step === next;
        return (
          <li
            key={step}
            aria-current={current ? "step" : undefined}
            className="flex min-w-0 items-start gap-2"
          >
            <span
              aria-hidden="true"
              className={cx(
                "mt-px grid size-5 shrink-0 place-items-center rounded-full text-2xs font-bold",
                event
                  ? "bg-brand text-white"
                  : current
                    ? "border-2 border-brand text-brand"
                    : "border-2 border-edge text-muted",
              )}
            >
              {event ? <CheckIcon className="size-3" /> : index + 1}
            </span>
            <span className="grid min-w-0">
              <span
                className={cx(
                  "text-caption whitespace-nowrap",
                  event || current ? "font-semibold text-ink" : "text-muted",
                )}
              >
                {TRIP_EVENT_LABELS[step]}
              </span>
              <span className="text-2xs text-muted tabular-nums">
                {event ? formatLocalTime(event.at) : current ? "Next" : " "}
              </span>
              {event?.note ? (
                <span className="text-2xs text-muted">{event.note}</span>
              ) : null}
            </span>
            {index < TRIP_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cx(
                  "mt-2.5 h-px min-w-4 flex-1 max-sm:hidden",
                  event ? "bg-brand" : "bg-hairline",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** A no-show and why, or a problem reported before, with its time, under the steps. */
function Extras({ events }: { events: readonly Event[] }) {
  const extra = events.filter(
    (e) => !(TRIP_STEPS as readonly string[]).includes(e.kind),
  );
  if (extra.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {extra.map((event) => (
        <li
          key={event.id}
          className="grid gap-0.5 rounded-control border border-danger-edge bg-danger-tint px-3 py-2 text-sm"
        >
          <span className="flex justify-between gap-2 font-semibold text-danger-strong">
            {event.kind === "problem"
              ? "Problem"
              : isTripEventKind(event.kind)
                ? TRIP_EVENT_LABELS[event.kind]
                : event.kind}
            <span className="tabular-nums">{formatLocalTime(event.at)}</span>
          </span>
          {event.note ? <span className="text-body">{event.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * "Report for the driver", sent now: the next step with an optional note,
 * or a no-show, in red, with why and asked once more, as in Connect: it ends the trip, and is taken
 * once the driver has arrived and the pickup time has passed.
 */
function ReportFor({
  bookingId,
  itemId,
  next,
  noShowWait,
}: {
  bookingId: string;
  itemId: string;
  next: TripEventKind;
  /** Why a no-show cannot be reported yet (`noShowRefusal`), as Connect waits; null once it can. */
  noShowWait: string | null;
}) {
  const [noShowOpen, setNoShowOpen] = useState(false);
  // The reason is written: asked once more before it is sent.
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    setNoShowOpen(false);
    setConfirming(false);
  };
  const step = useActionForm(reportForDriverAction, {
    done: `${TRIP_EVENT_LABELS[next]}: reported.`,
    reset: true,
  });
  const noShow = useActionForm(reportForDriverAction, {
    done: "No-show reported.",
    onDone: close,
  });

  const ids = (
    <>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="itemId" value={itemId} />
    </>
  );

  return (
    <div className="grid gap-3 rounded-control border border-card-edge bg-shade p-3">
      <p className="text-sm font-medium text-ink">Report for the driver</p>
      <form
        {...step.formProps}
        className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        {ids}
        <input type="hidden" name="kind" value={next} />
        <Field label="Note">
          <Input
            name="note"
            maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
            autoComplete="off"
            placeholder="Optional"
          />
        </Field>
        <Button type="submit" pending={step.pending}>
          {TRIP_EVENT_LABELS[next]}
        </Button>
        <FormError error={step.error} />
      </form>
      {noShowOpen ? (
        <form {...noShow.formProps} className="grid gap-2">
          {ids}
          <input type="hidden" name="kind" value="no-show" />
          <Field
            label="Why is it a no-show?"
            hint="It ends the trip, and its vendor is paid for it."
          >
            <Textarea
              name="note"
              required
              readOnly={confirming}
              rows={2}
              maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
              placeholder="Waited 45 minutes at arrivals, called twice, no answer"
            />
          </Field>
          {confirming ? (
            <p className="text-caption font-semibold text-danger-strong">
              Report a no-show now? The trip completes an hour after, unless it
              is taken back.
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            {confirming ? (
              <Button
                type="submit"
                size="sm"
                variant="danger"
                pending={noShow.pending}
              >
                Yes, report no-show
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={(event) => {
                  // The reason is checked by the browser before the second ask.
                  if (event.currentTarget.form?.reportValidity()) {
                    setConfirming(true);
                  }
                }}
              >
                Report no-show
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => (confirming ? setConfirming(false) : close())}
            >
              {confirming ? "Back" : "Cancel"}
            </Button>
          </div>
          <FormError error={noShow.error} size="xs" />
        </form>
      ) : noShowWait ? (
        <p className="text-caption text-muted">No-show: {noShowWait}</p>
      ) : (
        <div>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => setNoShowOpen(true)}
          >
            No-show
          </Button>
        </div>
      )}
    </div>
  );
}
