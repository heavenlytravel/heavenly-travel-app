import { DISTRICT_DATA, districtCodeAt, districtShape } from "./district-index";
import { bboxOf, unionBox, widenBox, type BBox } from "./geo";
import { SEARCH_MARGIN } from "./location-search";
import { isPlace } from "./place";
import { areaKm2, overlapKm2 } from "./zone-geometry";
import { polygonsOf, type ZoneShape } from "./zone-match";

/**
 * Where a location's places lie: its saved addresses against the states
 * Marketing ticked for it, and the boxes its searches keep to. A saved
 * address is a place in the location, so it lies in one of those states,
 * placed by its coordinates as a pickup is: in a district, whose state is
 * read off the boundary data. Reads the district shapes, so it stays on
 * the server. See docs/261003-location-flow.md.
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

/** The state of the place, by the district its coordinates fall in; null in no district. */
function stateCodeAt(place: { lat: number; lng: number }) {
  const code = districtCodeAt(place.lat, place.lng);
  return code === null ? null : (districtShape(code)?.stateCode ?? null);
}

/** A saved address that lies outside its location's states. */
export type StrayAddress = {
  name: string;
  /** Where it lies instead, "Langkawi, Kedah"; null when it is in no district. */
  district: string | null;
};

/**
 * The box around the states' districts, [west, south, east, north], for a
 * place search that keeps to them: the saved addresses' search. A box, so
 * a corner of a neighbouring state is in it; the check on the place itself
 * is `isInStates`. Null for no state.
 */
export function statesBounds(stateCodes: readonly string[]): BBox | null {
  const boxes = DISTRICT_DATA.districts
    .filter((district) => stateCodes.includes(district.stateCode))
    .map((district) => district.bbox);
  return boxes.length > 0 ? widenBox(unionBox(boxes), SEARCH_MARGIN) : null;
}

/**
 * A zone lies in a district when this share of it is there. Less is the
 * boundary data's coarse outlines against a finer zone, not a district
 * the location works in; the zone's own box is searched whatever.
 */
const DISTRICT_SHARE = 0.05;

/**
 * The box around a zone and the districts it lies in, for the search card
 * on the location's pages: a circle at Langkawi's airport puts the whole
 * of Langkawi first, and no more. Without the margin, which the card adds
 * once over all the zones.
 */
export function zoneSearchBox(shape: ZoneShape): BBox {
  const polygons = polygonsOf(shape);
  const area = areaKm2(polygons);
  const boxes = [bboxOf(polygons)];
  if (area > 0) {
    for (const district of DISTRICT_DATA.districts) {
      const shared = overlapKm2(polygons, district.polygons);
      if (shared > 0 && shared >= DISTRICT_SHARE * area) {
        boxes.push(district.bbox);
      }
    }
  }
  return unionBox(boxes);
}

/** Whether the place lies in one of the states. */
export function isInStates(
  place: { lat: number; lng: number },
  stateCodes: readonly string[],
) {
  const code = stateCodeAt(place);
  return code !== null && stateCodes.includes(code);
}

/**
 * The addresses that lie outside the states, in their order. An address
 * whose stored place cannot be read is not judged.
 */
export function strayAddresses(
  addresses: readonly { name: string; place: unknown }[],
  stateCodes: readonly string[],
): StrayAddress[] {
  return addresses.flatMap(({ name, place }) => {
    if (!isPlace(place)) return [];
    if (isInStates(place, stateCodes)) return [];
    const code = districtCodeAt(place.lat, place.lng);
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
