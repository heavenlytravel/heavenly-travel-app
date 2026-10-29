"use client";

import { formatMyr } from "@repo/db";
import { Button } from "@repo/ui/button";
import { useState } from "react";
import { SCOPE_FIELD } from "../../../../../../_lib/fleet-form";
import { ALL, type ScopeSlug } from "../../../../../../_lib/routes";
import { useActionForm } from "../../../../../../_lib/use-action-form";
import { BookingSummary } from "../../../_components/BookingSummary";
import { DetailsStep } from "../../../_components/DetailsStep";
import { HiddenFields } from "../../../_components/HiddenFields";
import { TripStep, VehicleStep } from "../../../_components/ItemSteps";
import {
  agreedPriceIssue,
  bookingTotalSen,
  chosenVehicle,
  detailsFields,
  tripFields,
  tripLine,
  tripQuotedSen,
  vehicleFields,
  vehicleLine,
  type AmendDraft,
  type ItemDetails,
  type TripDraft,
  type VehicleDraft,
} from "../../../_lib/trip-form";
import { amendItemAction } from "../../actions";

type AmendStep = "trip" | "vehicle" | "details";

/**
 * One trip of a booking in the manual booking's steps, filled in from
 * what is stored and priced again: the trip, the vehicle and its details,
 * each folded to a line with "Edit", the category fixed. Saving replaces
 * the item's trip, class and details on the server and sends the customer
 * a "Booking updated" email, then goes back to the booking where it was
 * opened.
 */
export function AmendItemForm({
  itemId,
  bookingHref,
  scope,
  draft: initial,
  hasGoogle,
  canPrice,
  priceNote,
}: {
  itemId: string;
  /** The booking in the scope the form was opened in. */
  bookingHref: string;
  scope: ScopeSlug;
  draft: AmendDraft;
  hasGoogle: boolean;
  canPrice: boolean;
  priceNote?: string;
}) {
  const [trip, setTrip] = useState<TripDraft>(initial.trip);
  const [vehicle, setVehicle] = useState<VehicleDraft>(initial.vehicle);
  const [details, setDetails] = useState<ItemDetails>(initial.details);
  const [open, setOpen] = useState<AmendStep | null>(null);
  const { pending, error, formProps } = useActionForm(amendItemAction, {
    done: "Trip amended. The customer gets a “Booking updated” email.",
  });

  const trips = [trip];
  const chosen = chosenVehicle(trips, vehicle);
  const priceIssue = canPrice ? agreedPriceIssue(trip) : null;
  const missing = !trip.quote
    ? "Fill in the trip."
    : !chosen
      ? "Choose a vehicle."
      : priceIssue;
  const totalSen = bookingTotalSen(trips, chosen, canPrice);

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
      <input type="hidden" name="itemId" value={itemId} />
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
            categoryLocked
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
            done={chosen !== null}
            open={open === "details"}
            onOpen={() => setOpen("details")}
            onDone={() => setOpen(null)}
          />
        </div>
        <aside className="@3xl:sticky @3xl:top-20">
          <BookingSummary
            meta={trip.quote?.location}
            rows={[
              { label: "Trip", value: trip.quote ? tripLine(trip) : "—" },
              {
                label: "Vehicle",
                value: chosen
                  ? vehicleLine(trips, vehicle, { price: false })
                  : "—",
              },
            ]}
            trips={[
              {
                id: trip.id,
                label: null,
                quotedSen: tripQuotedSen(trip, chosen),
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
              <Button type="submit" disabled={pending || missing !== null}>
                {pending
                  ? "Saving…"
                  : totalSen !== null
                    ? `Save changes · ${formatMyr(totalSen)}`
                    : "Save changes"}
              </Button>
            }
            missing={missing}
            error={error}
            cancelHref={bookingHref}
          />
        </aside>
      </div>
    </form>
  );
}
