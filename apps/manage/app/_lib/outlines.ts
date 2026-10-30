import "server-only";
import { DISTRICT_DATA } from "@repo/db/server";
import type {
  DistrictChoice,
  DistrictOutline,
} from "../(console)/[location]/coverage/zones/map-shapes";

/**
 * The district outlines of the states, for the map under a location's
 * zones: the admin sees how much of the state the zones cover.
 */
export function stateOutlines(
  stateCodes: readonly string[],
): DistrictOutline[] {
  return DISTRICT_DATA.districts
    .filter((district) => stateCodes.includes(district.stateCode))
    .map((district) => ({ name: district.name, polygons: district.polygons }));
}

/**
 * Every district, by state, for the zone maker's pick of a district as a
 * zone: the location's own states first, the rest after, since a zone may
 * be an outstation destination. Names only; the shape is read when picked.
 */
export function districtChoices(
  stateCodes: readonly string[],
): DistrictChoice[] {
  const states = [...DISTRICT_DATA.states].sort(
    (a, b) =>
      Number(stateCodes.includes(b.code)) -
        Number(stateCodes.includes(a.code)) || a.name.localeCompare(b.name),
  );
  return states.flatMap((state) => {
    const districts = DISTRICT_DATA.districts
      .filter((district) => district.stateCode === state.code)
      .map((district) => ({ code: district.code, name: district.name }));
    return districts.length > 0 ? [{ state: state.name, districts }] : [];
  });
}
