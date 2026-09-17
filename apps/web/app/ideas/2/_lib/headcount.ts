/**
 * Everything the page derives from one number: which vehicle, how many of
 * them, how the group is split across them, and where each vehicle sits on
 * the fleet ladder.
 */

import { FLEET, type Vehicle } from "../../../_lib/content";
import { MAX_SEATS, vehicleFor, type VehicleId } from "../../../_lib/routes";

export const MIN_COUNT = 1;
export const MAX_COUNT = 60;
export const START_COUNT = 12;

export function clampCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_COUNT;
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(value)));
}

/** "Premium MPV, 6 seats" reads as "Premium MPV" next to a seat count. */
export function shortName(vehicle: Vehicle): string {
  const name = vehicle.name.split(",")[0] ?? vehicle.name;
  return name.replace(/ with driver$/, "");
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function convoyName(vehicles: number, name: string): string {
  const lower = name.toLowerCase();
  return lower.endsWith("coach")
    ? `${vehicles} ${lower}es`
    : `${vehicles} x ${name}`;
}

export type Party = {
  count: number;
  vehicle: Vehicle;
  vehicleId: VehicleId;
  /** How many vehicles the group needs. */
  vehicles: number;
  /** Passengers in each vehicle, filled front to back. */
  loads: number[];
  spare: number;
  /** "Minibus" or "2 executive coaches". */
  label: string;
  dayRate: number;
};

export function partyOf(count: number): Party {
  const { vehicle, count: vehicles } = vehicleFor(count);
  const loads = Array.from({ length: vehicles }, (_, i) =>
    Math.min(vehicle.seats, Math.max(0, count - i * vehicle.seats)),
  );
  const name = shortName(vehicle);
  return {
    count,
    vehicle,
    vehicleId: vehicle.id,
    vehicles,
    loads,
    spare: vehicles * vehicle.seats - count,
    label: vehicles === 1 ? name : convoyName(vehicles, name),
    dayRate: vehicle.fromPerDay * vehicles,
  };
}

export type Band = {
  key: string;
  /** Null for the convoy band past the largest vehicle. */
  vehicle: Vehicle | null;
  lo: number;
  hi: number;
};

/** Each vehicle covers the head counts the one before it cannot. */
export const BANDS: Band[] = [
  ...FLEET.map((vehicle, i) => ({
    key: vehicle.id,
    vehicle,
    lo: (FLEET[i - 1]?.seats ?? 0) + 1,
    hi: vehicle.seats,
  })),
  { key: "convoy", vehicle: null, lo: MAX_SEATS + 1, hi: MAX_COUNT },
];

/**
 * The ladder uses a square-root scale, like a slide rule, so a 3-seat sedan
 * and a 44-seat coach can share one line without the sedan vanishing.
 */
export function ladderPosition(seats: number): number {
  return Math.sqrt(Math.max(0, seats) / MAX_COUNT);
}
