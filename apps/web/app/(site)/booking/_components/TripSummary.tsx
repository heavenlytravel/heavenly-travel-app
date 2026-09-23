import {
  CAR_MODE_LABELS,
  formatLocalDateTime,
  isPlace,
  type CarMode,
  type Place,
} from "@repo/db";
import type { BookingItemWithDetails } from "@repo/db/server";
import { Rows } from "../../_components/Page";

/** A car trip as every booking page describes it, before and after booking. */
export type TripView = {
  mode: CarMode;
  pickup: Place;
  dropoff: Place | null;
  startsAt: Date;
  hours: number | null;
  distanceKm: number | null;
};

/** The trip stored on a car item, or null when the item is another product. */
export function tripViewOfItem(item: BookingItemWithDetails): TripView | null {
  const details = item.carDetails;
  if (!details || !isPlace(details.pickupPlace)) return null;
  const mode = details.mode === "hourly" ? "hourly" : "oneway";
  return {
    mode,
    pickup: details.pickupPlace,
    dropoff: isPlace(details.dropoffPlace) ? details.dropoffPlace : null,
    startsAt: item.startsAt,
    hours: details.hours,
    distanceKm: details.distanceKm,
  };
}

/** The trip in one line, for lists: "KLIA to Kuala Lumpur" or "Penang, 4 hours". */
export function tripHeadline(trip: TripView) {
  if (trip.dropoff) return `${trip.pickup.label} to ${trip.dropoff.label}`;
  return trip.hours === null
    ? trip.pickup.label
    : `${trip.pickup.label}, ${trip.hours} hours`;
}

/** The rows after the trip: what was chosen on the options page. */
export function carDetailRows(details: {
  vehicleClassName: string;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
}): [label: string, value: React.ReactNode][] {
  const rows: [string, React.ReactNode][] = [
    ["Vehicle", details.vehicleClassName],
    ["Passengers", String(details.passengers)],
  ];
  if (details.childSeats > 0) {
    rows.push(["Child seats", String(details.childSeats)]);
  }
  if (details.flightNumber) rows.push(["Flight", details.flightNumber]);
  if (details.notes) rows.push(["Notes", details.notes]);
  return rows;
}

function placeLine(place: Place) {
  return (
    <>
      <span className="block">{place.label}</span>
      {place.address !== place.label && (
        <span className="block text-[0.85rem] font-normal text-[#67726f]">
          {place.address}
        </span>
      )}
    </>
  );
}

export function TripSummary({
  trip,
  extra = [],
}: {
  trip: TripView;
  /** Rows after the trip itself: passengers, vehicle class. */
  extra?: [label: string, value: React.ReactNode][];
}) {
  const rows: [string, React.ReactNode][] = [
    ["Trip", CAR_MODE_LABELS[trip.mode]],
    ["Pick-up", placeLine(trip.pickup)],
  ];
  if (trip.dropoff) rows.push(["Drop-off", placeLine(trip.dropoff)]);
  rows.push(["Pick-up time", formatLocalDateTime(trip.startsAt)]);
  if (trip.hours !== null) rows.push(["Duration", `${trip.hours} hours`]);
  if (trip.distanceKm !== null) {
    rows.push(["Road distance", `${trip.distanceKm.toFixed(1)} km`]);
  }
  return <Rows rows={[...rows, ...extra]} />;
}
