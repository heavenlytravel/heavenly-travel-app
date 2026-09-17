import { ringgit } from "../../../_lib/content";
import {
  PLACES,
  distanceKm,
  driveMinutes,
  formatDrive,
  oneWayFare,
  vehicleById,
  type PlaceId,
  type VehicleId,
} from "../../../_lib/routes";

/** What the chart's cells show. */
export type Mode = "time" | "km" | "fare";

export const MODES: { value: Mode; label: string }[] = [
  { value: "time", label: "Drive time" },
  { value: "km", label: "Kilometres" },
  { value: "fare", label: "Fare" },
];

export type Journey = { from: PlaceId; to: PlaceId };

/** Penang to Cameron Highlands: mid-chart, and it shows a place note. */
export const DEFAULT_JOURNEY: Journey = { from: "penang", to: "cameron" };

/** Footnote marks for the places that carry a note, in chart order. */
const MARKS = ["†", "‡", "§", "¶"];

export const PLACE_MARKS = new Map<PlaceId, string>(
  PLACES.filter((p) => p.note).map((p, i) => [p.id, MARKS[i] ?? "*"]),
);

export const PLACE_NOTES = PLACES.flatMap((p) =>
  p.note
    ? [{ id: p.id, mark: PLACE_MARKS.get(p.id) ?? "*", note: p.note }]
    : [],
);

/** The figure printed in a cell. Fares drop the "RM" to fit the square. */
export function cellFigure(
  mode: Mode,
  vehicle: VehicleId,
  a: PlaceId,
  b: PlaceId,
): string {
  if (mode === "km") return distanceKm(a, b).toLocaleString("en-MY");
  if (mode === "fare") return oneWayFare(vehicle, a, b).toLocaleString("en-MY");
  return formatDrive(driveMinutes(a, b));
}

/** The same figure, spelt out for a screen reader. */
export function cellReading(
  mode: Mode,
  vehicle: VehicleId,
  a: PlaceId,
  b: PlaceId,
): string {
  if (mode === "km") return `${distanceKm(a, b)} kilometres`;
  if (mode === "fare") {
    return `${ringgit(oneWayFare(vehicle, a, b))} one way by ${vehicleById(vehicle).name.toLowerCase()}`;
  }
  return formatDrive(driveMinutes(a, b));
}
