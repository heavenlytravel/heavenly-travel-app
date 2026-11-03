"use client";

import {
  formatLocalTime,
  isTripEventKind,
  nextTripStep,
  TRIP_EVENT_LABELS,
  TRIP_EVENT_NOTE_MAX_LENGTH,
  TRIP_STEPS,
  waitingMinutes,
  type TripEventKind,
} from "@repo/db";
import type { FulfilmentTrip } from "@repo/db/server";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Field, Input, Textarea } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { CheckIcon } from "@repo/ui/icons";
import { useState } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { useActionForm } from "@repo/console/use-action-form";
import { reportForDriverAction } from "./actions";

type Event = {
  id: string;
  itemId: string;
  kind: string;
  at: Date;
  note: string | null;
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
        {shown.map((trip) => {
          const own = events.filter((e) => e.itemId === trip.id);
          const next = nextTripStep(own);
          const open =
            next !== null &&
            trip.status !== "cancelled" &&
            trip.status !== "completed";
          const waited = waitingMinutes(own);
          return (
            <div key={trip.id} className="grid gap-4">
              {trips.length > 1 ? (
                <p className="text-sm font-medium text-ink">
                  Trip {trip.position}
                </p>
              ) : null}
              <StepLine events={own} next={open ? next : null} />
              <Extras events={own} />
              {waited !== null ? (
                <p className="text-sm text-muted">
                  Waited {waited} min for the passenger.
                </p>
              ) : null}
              {canFulfil && open ? (
                <ReportFor bookingId={bookingId} itemId={trip.id} next={next} />
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * The four steps in a line from `sm` up, two by two on a phone: ticked
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
      className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:gap-x-2"
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

/** A no-show or a problem, with its time and note, under the steps. */
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
 * a no-show (asked first, as it ends the trip), or a problem in a few
 * words. Nothing else, as in Connect.
 */
function ReportFor({
  bookingId,
  itemId,
  next,
}: {
  bookingId: string;
  itemId: string;
  next: TripEventKind;
}) {
  const [problem, setProblem] = useState(false);
  const step = useActionForm(reportForDriverAction, {
    done: `${TRIP_EVENT_LABELS[next]}: reported.`,
    reset: true,
  });
  const [dialog, confirm] = useConfirm();
  const noShow = useActionForm(reportForDriverAction, {
    ask: () =>
      confirm({
        title: "Report a no-show?",
        description:
          "The passenger did not come. This ends the trip, and its vendor is paid for it.",
        action: "Report no-show",
        danger: true,
      }),
    done: "No-show reported.",
  });
  const report = useActionForm(reportForDriverAction, {
    done: "Problem reported.",
    onDone: () => setProblem(false),
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
      {problem ? (
        <form {...report.formProps} className="grid gap-2">
          {ids}
          <input type="hidden" name="kind" value="problem" />
          <Field label="What is the problem?">
            <Textarea
              name="note"
              required
              rows={2}
              maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
              placeholder="Flat tyre on the way, about 30 minutes late"
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              variant="danger"
              pending={report.pending}
            >
              Send problem
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setProblem(false)}
            >
              Cancel
            </Button>
          </div>
          <FormError error={report.error} size="xs" />
        </form>
      ) : (
        <div className="flex flex-wrap items-start gap-2">
          <form {...noShow.formProps} className="grid gap-1">
            {ids}
            <input type="hidden" name="kind" value="no-show" />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              pending={noShow.pending}
            >
              No-show
            </Button>
            <FormError error={noShow.error} size="xs" />
          </form>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setProblem(true)}
          >
            Problem
          </Button>
        </div>
      )}
      {dialog}
    </div>
  );
}
