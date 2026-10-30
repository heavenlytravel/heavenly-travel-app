"use client";

import {
  DECLINE_NOTE_MAX_LENGTH,
  DECLINE_REASONS,
  DECLINE_REASON_LABELS,
} from "@repo/db";
import type { DriverOffer, DriverTrip } from "@repo/db/server";
import { Input } from "@repo/ui/field";
import { useState, type ReactNode } from "react";
import type { ActionState } from "@repo/console/action-state";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/notice";
import { CheckIcon, TriangleAlertIcon, UsersIcon, XIcon } from "@repo/ui/icons";
import { dayLabel } from "../_lib/when";
import { BigTime, Chip, Panel, Pill, RouteLine } from "../_ui/parts";
import { areaStops } from "../_ui/Trips";
import { answerOfferAction } from "../actions";

/**
 * A job offered to the driver: only the trip, the day and time, the areas,
 * the class and the passengers, never the customer. The timing warnings
 * stand above the buttons, so whoever accepts has seen them. Declining
 * asks why.
 */
export function OfferCard({ offer, now }: { offer: DriverOffer; now: Date }) {
  return (
    <OfferPanel
      head={
        <>
          <Pill tone="amber">New offer</Pill>
          <span className="text-xs font-semibold text-muted tabular-nums">
            {offer.reference}
          </span>
        </>
      }
    >
      <OfferTrips trips={offer.trips} now={now} />
      <OfferWarnings warnings={offer.warnings} />
      <OfferAnswer action={answerOfferAction} offerId={offer.offerId} />
    </OfferPanel>
  );
}

/** An offer's card: an amber edge and head, as everything waiting for a yes has. */
export function OfferPanel({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <Panel className="connect-rise overflow-hidden border-warning-edge">
      <div className="flex items-center justify-between gap-3 border-b border-warning-edge bg-warning-tint px-5 py-3">
        {head}
      </div>
      <div className="grid gap-5 p-5">{children}</div>
    </Panel>
  );
}

/** An offer's trips, by area only: the day and time, where from and to, the class and the passengers. */
export function OfferTrips({
  trips,
  now,
  extra,
}: {
  trips: DriverTrip[];
  now: Date;
  /** What a trip shows beside: a vendor's amounts. */
  extra?: (trip: DriverTrip) => ReactNode;
}) {
  return (
    <ol className="grid gap-5">
      {trips.map((trip) => (
        <li
          key={trip.itemId}
          className="grid gap-3 border-hairline not-first:border-t not-first:pt-5"
        >
          <div className="flex items-end justify-between gap-3">
            <div className="grid gap-1">
              <span className="text-sm font-semibold text-muted">
                {dayLabel(trip.startsAt, now)}
                {trips.length > 1 ? ` · trip ${trip.position}` : ""}
              </span>
              <BigTime at={trip.startsAt} className="text-3xl text-ink" />
            </div>
            {trip.endsAt ? (
              <span className="pb-0.5 text-sm text-muted">
                until <BigTime at={trip.endsAt} className="text-base" />
              </span>
            ) : null}
          </div>
          <RouteLine stops={areaStops(trip)} size="sm" />
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{trip.className}</Chip>
            <Chip icon={UsersIcon}>
              {trip.passengers}{" "}
              {trip.passengers === 1 ? "passenger" : "passengers"}
            </Chip>
          </div>
          {extra?.(trip)}
        </li>
      ))}
    </ol>
  );
}

/** The timing warnings, in amber, and that accepting owns the timing. */
export function OfferWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <Notice className="flex gap-3 p-4">
      <TriangleAlertIcon className="mt-0.5 size-5 text-warning" />
      <div className="grid gap-1">
        {warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
        <p className="font-semibold">
          If you accept, the timing is yours to keep.
        </p>
      </div>
    </Notice>
  );
}

/**
 * Accept or decline an offer, every trip of it together: the action gets
 * `offerId`, `answer`, and with a decline its `reason` and `note`.
 * `blocked` says why accepting must wait, and disables it.
 */
export function OfferAnswer({
  action,
  offerId,
  blocked,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  offerId: string;
  blocked?: string;
}) {
  const [declining, setDeclining] = useState(false);
  const { pending, error, formProps } = useActionForm(action, {
    done: declining ? "Declined. Operation finds someone else." : "Accepted.",
  });

  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="offerId" value={offerId} />
      <input
        type="hidden"
        name="answer"
        value={declining ? "decline" : "accept"}
      />
      {declining ? (
        <div className="grid gap-4 rounded-card border border-card-edge bg-shade p-4">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold text-ink">
              Why can't you take it?
            </legend>
            <div className="flex flex-wrap gap-2">
              {DECLINE_REASONS.map((reason) => (
                <label key={reason} className="cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    required
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-10 items-center rounded-full border border-edge bg-white px-4 text-sm font-semibold text-body transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-(length:--ring-width) peer-focus-visible:outline-offset-(length:--ring-offset) peer-focus-visible:outline-ring">
                    {DECLINE_REASON_LABELS[reason]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-body">
              A few words{" "}
              <span className="font-normal text-muted">
                (needed for “Other”)
              </span>
            </span>
            <Input name="note" maxLength={DECLINE_NOTE_MAX_LENGTH} />
          </label>
          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setDeclining(false)}
            >
              Back
            </Button>
            <Button type="submit" variant="danger" size="lg" pending={pending}>
              {pending ? "Sending…" : "Decline offer"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {blocked ? (
            <p className="rounded-control bg-shade px-3 py-2 text-sm text-muted">
              {blocked}
            </p>
          ) : null}
          <div className="grid grid-cols-[1fr_1.6fr] gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setDeclining(true)}
            >
              <XIcon className="size-5" />
              Decline
            </Button>
            <Button
              type="submit"
              size="lg"
              pending={pending}
              disabled={blocked !== undefined}
            >
              <CheckIcon className="size-5" />
              {pending ? "Sending…" : "Accept"}
            </Button>
          </div>
        </>
      )}
      <FormError error={error} />
    </form>
  );
}
