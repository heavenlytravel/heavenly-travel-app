"use client";

import { guideOfferIssue, TRIP_CATEGORY_LABELS, type BBox } from "@repo/db";
import type { ReactNode } from "react";
import {
  flightLabelOf,
  tripIssue,
  tripLine,
  vehicleLine,
  type ChosenVehicle,
  type ItemDetails,
  type ItemDraft,
  type TripClashNote,
  type TripDraft,
  type VehicleDraft,
} from "../_lib/trip-form";
import { DetailsFields } from "./DetailsStep";
import { TripFields, VehicleFields } from "./ItemSteps";
import { Step, StepFoot } from "./Step";

/** Why a new booking's item cannot be left yet; null once it can. */
export function itemIssue(
  item: ItemDraft,
  chosen: ChosenVehicle | null,
  clash: TripClashNote | null,
): string | null {
  if (item.trip.quoteError) return item.trip.quoteError;
  if (!item.trip.quote) return tripIssue(item.trip.trip) ?? "Pricing the trip…";
  if (clash) return clash.label;
  if (!chosen) return "Choose a vehicle that fits the group.";
  return guideOfferIssue(item.details.guide.language, item.trip.quote.guides);
}

/**
 * One trip of a new booking, a step of its own with everything it takes:
 * the trip, priced by itself once complete; its vehicle and group; then
 * what the driver needs and its add-ons, the tour guide in a language on
 * sale for this trip. With one vehicle for every trip (`shared`), trip 1
 * chooses it, judged for every trip, and the others show it, their
 * category fixed to its. Folded, a line says the trip and its vehicle.
 */
export function BookingTripStep({
  number,
  index,
  item,
  trips,
  shared,
  vehicle,
  chosen,
  clash,
  onTrip,
  onVehicle,
  onDetails,
  open,
  onOpen,
  onNext,
  hasGoogle,
  near,
  aside,
}: {
  number: number;
  /** Its place in the list, from 0: "Trip 1" is 0. */
  index: number;
  item: ItemDraft;
  /** Every trip of the booking, for the vehicle they share. */
  trips: readonly TripDraft[];
  /** One vehicle does every trip, and there are several. */
  shared: boolean;
  /** The vehicle that does it: its own, or trip 1's when shared. */
  vehicle: VehicleDraft;
  chosen: ChosenVehicle | null;
  clash: TripClashNote | null;
  onTrip: (patch: Partial<TripDraft>) => void;
  onVehicle: (patch: Partial<VehicleDraft>) => void;
  onDetails: (patch: Partial<ItemDetails>) => void;
  open: boolean;
  onOpen: () => void;
  onNext: () => void;
  hasGoogle: boolean;
  near?: BBox;
  /** Beside its "Continue": "Remove Trip". */
  aside?: ReactNode;
}) {
  const { trip, details } = item;
  const quote = trip.quote;
  const issue = itemIssue(item, chosen, clash);
  const follows = shared && index > 0;
  const vehicleTrips = shared ? trips : [trip];
  const guideIssue = quote
    ? guideOfferIssue(details.guide.language, quote.guides)
    : null;

  return (
    <Step
      number={number}
      title={`Trip ${index + 1} · ${TRIP_CATEGORY_LABELS[trip.trip.category]}`}
      done={issue === null}
      summary={
        clash ? (
          <span className="text-danger">{clash.label}</span>
        ) : quote ? (
          `${tripLine(trip)} · ${vehicleLine(vehicleTrips, vehicle, { price: false })}`
        ) : (
          tripLine(trip)
        )
      }
      open={open}
      onOpen={onOpen}
    >
      <div className="grid gap-6">
        <TripFields
          draft={trip}
          onChange={onTrip}
          hasGoogle={hasGoogle}
          categoryLocked={follows}
          near={near}
          clash={clash}
        />
        <Part title="Vehicle">
          {follows ? (
            <p className="text-sm text-body">
              {chosen ? (
                <>
                  Same as trip 1:{" "}
                  {vehicleLine(trips, vehicle, { price: false })}.
                </>
              ) : (
                <span className="text-muted">
                  {trips.every((draft) => draft.quote)
                    ? "Trip 1's vehicle cannot do this trip for the group. Choose another on trip 1, or turn off “Same vehicle for every trip”."
                    : "Same as trip 1, once every trip is priced."}
                </span>
              )}
            </p>
          ) : (
            <VehicleFields
              trips={vehicleTrips}
              vehicle={vehicle}
              chosen={chosen}
              onChange={onVehicle}
            />
          )}
        </Part>
        {quote ? (
          <Part title="Details and Add-ons" optional>
            <DetailsFields
              details={details}
              onChange={onDetails}
              category={trip.trip.category}
              guideOffers={quote.guides}
              guideIssue={guideIssue}
              flightLabel={flightLabelOf(quote)}
            />
          </Part>
        ) : null}
      </div>
      <StepFoot
        disabled={issue !== null}
        missing={trip.quoteError ? null : issue}
        onNext={onNext}
        aside={aside}
      />
    </Step>
  );
}

/** A part of the trip's step under a hairline: its name, then its fields. */
function Part({
  title,
  optional = false,
  children,
}: {
  title: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-hairline pt-5">
      <h3 className="text-sm font-semibold text-ink">
        {title}
        {optional ? (
          <span className="ml-2 text-caption font-normal text-muted">
            Optional
          </span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}
