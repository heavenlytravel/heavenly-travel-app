import {
  andList,
  cornerCount,
  isZoneCircle,
  isZoneDistrict,
  isZoneReshaped,
  isZoneShape,
  plural,
  type PricedFrom,
} from "@repo/db";

/**
 * How the coverage screens describe a zone: how it was made, and which
 * other locations price routes to it. Coverage, in a location and
 * across locations, and the zone editor read these; the counting is
 * @repo/db's (zone-routes).
 */

/** "km" with one decimal at most: 1.5, 25. */
const kmOf = (metres: number) => {
  const km = metres / 1000;
  return km % 1 === 0 ? String(km) : km.toFixed(1);
};

/**
 * How a zone was made, in a line: where it started, and its corners when
 * drawn. A zone of some mukims counts them; their names are in the zone
 * maker, which reads the mukims' file.
 */
export function drawnAs(zone: { shape: unknown; drawnFrom: unknown }) {
  if (isZoneDistrict(zone.drawnFrom)) {
    const { label, mukimCodes = [] } = zone.drawnFrom;
    return mukimCodes.length > 0
      ? `${plural(mukimCodes.length, "mukim")} of the district ${label}, as ${mukimCodes.length === 1 ? "it is" : "they are"}`
      : `The district ${label}, as it is`;
  }
  if (isZoneReshaped(zone.drawnFrom)) {
    const { label, mukimCodes = [] } = zone.drawnFrom;
    return mukimCodes.length > 0
      ? `Reshaped from ${plural(mukimCodes.length, "mukim")} of the district ${label}`
      : `Reshaped from the district ${label}`;
  }
  if (isZoneCircle(zone.drawnFrom)) {
    return `Started as a ${kmOf(zone.drawnFrom.radiusM)} km circle around ${zone.drawnFrom.label}`;
  }
  const corners = isZoneShape(zone.shape) ? cornerCount(zone.shape) : 0;
  return corners > 0 ? `Drawn, ${plural(corners, "corner")}` : "Drawn";
}

/** "Kuala Lumpur prices 1 route to it", or "Kuala Lumpur and Penang price routes to it". */
export function pricedFromSentence(pricedFrom: PricedFrom): string {
  const [only] = pricedFrom;
  return pricedFrom.length === 1 && only
    ? `${only.location} prices ${plural(only.routes, "route")} to it`
    : `${andList(pricedFrom.map((entry) => entry.location))} price routes to it`;
}
