"use client";

import {
  DECLINE_NOTE_MAX_LENGTH,
  DECLINE_REASONS,
  DECLINE_REASON_LABELS,
  formatLocalDate,
  formatLocalTime,
} from "@repo/db";
import type { DriverOffer, DriverTrip } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Field, Input, Radio } from "@repo/ui/field";
import { useState, type ReactNode } from "react";
import type { ActionState } from "@repo/console/action-state";
import { Card } from "@repo/console/Card";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "@repo/console/use-action-form";
import { answerOfferAction } from "../actions";

/**
 * A job offered to the driver: only the trip, the day and time, the areas,
 * the class and the passengers, never the customer. The timing warnings
 * stand above the buttons, so whoever accepts has seen them. Declining
 * asks why.
 */
export function OfferCard({ offer }: { offer: DriverOffer }) {
  return (
    <Card className="grid gap-4">
      <OfferTrips trips={offer.trips} reference={offer.reference} />
      <OfferWarnings warnings={offer.warnings} />
      <OfferAnswer action={answerOfferAction} offerId={offer.offerId} />
    </Card>
  );
}

/** An offer's trips, by area only: the day and time, where from and to, the class and the passengers. */
export function OfferTrips({
  trips,
  reference,
  extra,
}: {
  trips: DriverTrip[];
  reference: string;
  /** What a trip shows beside, by its item id: a vendor's amounts. */
  extra?: (trip: DriverTrip) => ReactNode;
}) {
  return (
    <ul className="grid gap-3">
      {trips.map((trip) => (
        <li key={trip.itemId} className="grid gap-0.5">
          <span className="font-semibold tabular-nums">
            {formatLocalDate(trip.startsAt)}, {formatLocalTime(trip.startsAt)}
            {trip.endsAt ? ` to ${formatLocalTime(trip.endsAt)}` : ""}
          </span>
          <span className="text-slate-700">
            {trip.dropoffArea
              ? `${trip.pickupArea} → ${trip.dropoffArea}`
              : `${trip.pickupArea}, by the hour`}
          </span>
          <span className="text-sm text-slate-500">
            {trip.className} · {trip.passengers} passengers · {reference}
          </span>
          {extra?.(trip)}
        </li>
      ))}
    </ul>
  );
}

/** The timing warnings, in amber, and that accepting owns the timing. */
export function OfferWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="grid gap-1 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
      <p className="font-medium">If you accept, the timing is yours to keep.</p>
    </div>
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
        <>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Why?</legend>
            {DECLINE_REASONS.map((reason) => (
              <label key={reason} className="flex items-center gap-2">
                <Radio name="reason" value={reason} required />
                {DECLINE_REASON_LABELS[reason]}
              </label>
            ))}
          </fieldset>
          <Field label="A few words" hint="Needed for “Other”.">
            <Input name="note" maxLength={DECLINE_NOTE_MAX_LENGTH} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setDeclining(false)}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="caution"
              size="lg"
              disabled={pending}
            >
              Decline
            </Button>
          </div>
        </>
      ) : (
        <>
          {blocked ? <p className="text-sm text-slate-600">{blocked}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setDeclining(true)}
            >
              Decline
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={pending || blocked !== undefined}
            >
              {pending ? "Sending…" : "Accept"}
            </Button>
          </div>
        </>
      )}
      <FormError error={error} />
    </form>
  );
}
