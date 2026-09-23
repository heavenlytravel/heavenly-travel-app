/**
 * A resolved place as snapshotted onto a booking item: what Google told us
 * about it at booking time. Stored as JSON and never queried by field. The
 * places package (step 2 of docs/car-with-driver.md) produces these. Browser-safe.
 */
export type Place = {
  /** Google place id. */
  placeId: string;
  /** Short name people recognise: "KLIA Terminal 1". */
  label: string;
  /** Full formatted address. */
  address: string;
  lat: number;
  lng: number;
  /** administrative_area_level_1, as Google spells it. */
  state: string | null;
  /** administrative_area_level_2, often missing in Malaysia. */
  district: string | null;
  /** locality; in Malaysia this frequently carries the district name. */
  locality: string | null;
};

export function isPlace(value: unknown): value is Place {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  const nullableString = (v: unknown) => v === null || typeof v === "string";
  return (
    typeof p.placeId === "string" &&
    typeof p.label === "string" &&
    typeof p.address === "string" &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    nullableString(p.state) &&
    nullableString(p.district) &&
    nullableString(p.locality)
  );
}
