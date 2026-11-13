"use client";

import { formatMyr, guideOfferIssue } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { useState } from "react";
import { SCOPE_FIELD } from "@repo/console/fleet-form";
import type { ActionState } from "@repo/console/action-state";
import { ALL, type ScopeSlug } from "../../../../_lib/routes";
import { useActionForm } from "@repo/console/use-action-form";
import { BillingLine } from "./BillingLine";
import { BookingSummary } from "./BookingSummary";
import { DetailsStep } from "./DetailsStep";
import { HiddenFields } from "./HiddenFields";
import { TripStep, VehicleStep } from "./ItemSteps";
import {
  agreedPriceIssue,
  bookingTotalSen,
  chosenVehicle,
  detailsFields,
  tripFields,
  tripLine,
  tripPriceLines,
  vehicleFields,
  vehicleLine,
  type ItemDraft,
  type ItemDetails,
  type TripDraft,
  type VehicleDraft,
} from "../_lib/trip-form";

type TripItemStep = "trip" | "vehicle" | "details";

/**
 * One trip of a booking in the manual booking's steps: the trip, the
 * vehicle and its details, each folded to a line with "Edit". Amending,
 * it starts from what is stored, priced again, and saving replaces the
 * item's trip, class and details on the server; adding, it starts blank
 * and saving adds the trip to the booking. Either way the customer gets a
 * "Booking updated" email and the admin goes back to the booking where it
 * was opened. With `ask`, saving asks first: a trip with a vendor
 * assigned, let go by the amend.
 */
export function TripItemForm({
  action,
  target,
  done,
  ask,
  bookingHref,
  scope,
  draft: initial,
  startOpen = false,
  hasGoogle,
  canPrice,
  priceNote,
  booking,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /**
   * The booking the trip is on, for the line above the button: its total
   * before and after, and what saving bills. `tripSen` is what the trip
   * charges now, 0 for one being added.
   */
  booking: { id: string; chargedSen: number; tripSen: number };
  /** The record saved: the item amended, or the booking a trip is added to. */
  target: { name: "itemId" | "bookingId"; value: string };
  /** The toast once saved. */
  done: string;
  ask?: { title: string; description: string; action: string };
  /** The booking in the scope the form was opened in. */
  bookingHref: string;
  scope: ScopeSlug;
  draft: ItemDraft;
  /** A blank trip opens on its first step. */
  startOpen?: boolean;
  hasGoogle: boolean;
  canPrice: boolean;
  priceNote?: string;
}) {
  const [trip, setTrip] = useState<TripDraft>(initial.trip);
  const [vehicle, setVehicle] = useState<VehicleDraft>(initial.vehicle);
  const [details, setDetails] = useState<ItemDetails>(initial.details);
  const [open, setOpen] = useState<TripItemStep | null>(
    startOpen ? "trip" : null,
  );
  const [dialog, confirm] = useConfirm();
  const { pending, error, formProps } = useActionForm(action, {
    ask: ask ? () => confirm(ask) : undefined,
    done,
  });

  const trips = [trip];
  const chosen = chosenVehicle(trips, vehicle);
  const priceIssue = canPrice ? agreedPriceIssue(trip) : null;
  const guideOffers = trip.quote?.guides ?? [];
  const guideIssue = trip.quote
    ? guideOfferIssue(details.guide.language, guideOffers)
    : null;
  const missing = !trip.quote
    ? "Fill in the trip."
    : !chosen
      ? "Choose a vehicle."
      : (priceIssue ?? guideIssue);
  const totalSen = bookingTotalSen(
    [{ trip, vehicle, details }],
    null,
    canPrice,
  );

  return (
    <form
      {...formProps}
      // Enter in a field does not save the trip: the button does.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
      className="@container"
    >
      <input type="hidden" name={target.name} value={target.value} />
      <input type="hidden" name={SCOPE_FIELD} value={scope ?? ALL} />
      <HiddenFields fields={tripFields(1, trip, canPrice)} />
      <HiddenFields fields={vehicleFields(chosen, vehicle)} />
      <HiddenFields fields={detailsFields(details, trip.trip.category)} />

      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
        <div className="grid min-w-0 gap-3">
          <TripStep
            number={1}
            title="Trip"
            draft={trip}
            onChange={(patch) =>
              setTrip((current) => ({ ...current, ...patch }))
            }
            open={open === "trip"}
            onOpen={() => setOpen("trip")}
            onNext={() => setOpen("vehicle")}
            hasGoogle={hasGoogle}
          />
          <VehicleStep
            number={2}
            trips={trips}
            vehicle={vehicle}
            onChange={(patch) =>
              setVehicle((current) => ({ ...current, ...patch }))
            }
            open={open === "vehicle"}
            onOpen={() => setOpen("vehicle")}
            onNext={() => setOpen("details")}
          />
          <DetailsStep
            number={3}
            details={details}
            onChange={(patch) =>
              setDetails((current) => ({ ...current, ...patch }))
            }
            category={trip.trip.category}
            guideOffers={guideOffers}
            guideIssue={guideIssue}
            done={chosen !== null}
            open={open === "details"}
            onOpen={() => setOpen("details")}
            onDone={() => setOpen(null)}
          />
        </div>
        <aside className="@3xl:sticky @3xl:top-20">
          <BookingSummary
            meta={trip.quote?.location}
            trips={[
              {
                id: trip.id,
                label: null,
                detail: trip.quote ? (
                  <>
                    {tripLine(trip)}
                    <span className="block">
                      {chosen
                        ? vehicleLine(trips, vehicle, { price: false })
                        : "No vehicle yet"}
                    </span>
                  </>
                ) : (
                  "Not priced yet"
                ),
                lines: tripPriceLines(trip, chosen, details.guide.language),
                agreedPrice: trip.agreedPrice,
                priceReason: trip.priceReason,
              },
            ]}
            onPriceChange={(_id, patch) =>
              setTrip((current) => ({ ...current, ...patch }))
            }
            canPrice={canPrice}
            priceNote={priceNote}
            submit={
              <>
                <BillingLine
                  bookingId={booking.id}
                  nowSen={booking.chargedSen}
                  chargedSen={
                    totalSen === null
                      ? null
                      : booking.chargedSen - booking.tripSen + totalSen
                  }
                />
                <Button
                  type="submit"
                  disabled={missing !== null}
                  pending={pending}
                  className="mt-1"
                >
                  {pending
                    ? "Saving…"
                    : totalSen !== null
                      ? `Save Trip · ${formatMyr(totalSen)}`
                      : "Save Trip"}
                </Button>
              </>
            }
            missing={missing}
            error={error}
            cancelHref={bookingHref}
          />
        </aside>
      </div>
      {dialog}
    </form>
  );
}
