import { DISTRICT_DATA, districtCodeAt, districtShape } from "./district-index";
import { isPlace } from "./place";

/**
 * Where a location's saved addresses lie against the districts Marketing
 * ticked for it. A saved address is a place in the location, so it lies in
 * one of those districts, placed by its coordinates as a pickup is. Reads
 * the district shapes, so it stays on the server. See
 * docs/261003-location-flow.md.
 */

const stateNames = new Map(
  DISTRICT_DATA.states.map((state) => [state.code, state.name]),
);

/** "Langkawi, Kedah": a district as the screens name it; the code when it is not known. */
function districtLabel(code: string) {
  const district = districtShape(code);
  return district
    ? `${district.name}, ${stateNames.get(district.stateCode) ?? district.stateCode}`
    : code;
}

/** A saved address that lies outside its location's districts. */
export type StrayAddress = {
  name: string;
  /** Where it lies instead, "Langkawi, Kedah"; null when it is in no district. */
  district: string | null;
};

/** Whether the place lies in one of the districts. */
export function isInDistricts(
  place: { lat: number; lng: number },
  districtCodes: readonly string[],
) {
  const code = districtCodeAt(place.lat, place.lng);
  return code !== null && districtCodes.includes(code);
}

/**
 * The addresses that lie outside the districts, in their order. An address
 * whose stored place cannot be read is not judged.
 */
export function strayAddresses(
  addresses: readonly { name: string; place: unknown }[],
  districtCodes: readonly string[],
): StrayAddress[] {
  return addresses.flatMap(({ name, place }) => {
    if (!isPlace(place)) return [];
    const code = districtCodeAt(place.lat, place.lng);
    if (code !== null && districtCodes.includes(code)) return [];
    return [{ name, district: code === null ? null : districtLabel(code) }];
  });
}

/** "Kuah Jetty is in Langkawi, Kedah; Open Sea is in no district of Malaysia". */
export function strayAddressesPhrase(stray: readonly StrayAddress[]) {
  return stray
    .map(({ name, district }) =>
      district
        ? `${name} is in ${district}`
        : `${name} is in no district of Malaysia`,
    )
    .join("; ");
}
