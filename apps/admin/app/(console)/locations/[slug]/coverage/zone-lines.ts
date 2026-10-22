import {
  andList,
  cornerCount,
  isZoneCircle,
  isZoneDistrict,
  isZoneReshaped,
  isZoneShape,
  plural,
} from "@repo/db";

/**
 * How the coverage screens describe a zone: how it was made, how many
 * priced routes it is an end of, and which other locations price routes to
 * it. The Coverage tab, its zone editor and the Coverage screen across
 * locations read these.
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

/** How many priced routes each zone is an end of, by the zone's id. */
export function pricedRoutesByZone(
  rates: readonly { fromZoneId: string; toZoneId: string }[],
): Map<string, number> {
  const routesOf = new Map<string, Set<string>>();
  for (const rate of rates) {
    const route = `${rate.fromZoneId}|${rate.toZoneId}`;
    for (const zoneId of [rate.fromZoneId, rate.toZoneId]) {
      const routes = routesOf.get(zoneId) ?? new Set<string>();
      routes.add(route);
      routesOf.set(zoneId, routes);
    }
  }
  return new Map(
    [...routesOf].map(([zoneId, routes]) => [zoneId, routes.size]),
  );
}

/** The other locations that price routes to a zone, each with how many. */
export type PricedFrom = { location: string; routes: number }[];

/**
 * The other locations whose grids end at each zone, by the zone's id: their
 * routes out, such as Kuala Lumpur's to Selangor's KLIA, which go when the
 * zone is removed.
 */
export function pricedFromByZone(
  rates: readonly {
    fromZoneId: string;
    toZoneId: string;
    location: { name: string };
  }[],
): Map<string, PricedFrom> {
  const routesOf = new Map<string, Map<string, Set<string>>>();
  for (const rate of rates) {
    const locations =
      routesOf.get(rate.toZoneId) ?? new Map<string, Set<string>>();
    const routes = locations.get(rate.location.name) ?? new Set<string>();
    routes.add(rate.fromZoneId);
    locations.set(rate.location.name, routes);
    routesOf.set(rate.toZoneId, locations);
  }
  return new Map(
    [...routesOf].map(([zoneId, locations]) => [
      zoneId,
      [...locations]
        .map(([location, routes]) => ({ location, routes: routes.size }))
        .sort((a, b) => a.location.localeCompare(b.location)),
    ]),
  );
}

/** "Kuala Lumpur prices 1 route to it", or "Kuala Lumpur and Penang price routes to it". */
export function pricedFromSentence(pricedFrom: PricedFrom): string {
  const [only] = pricedFrom;
  return pricedFrom.length === 1 && only
    ? `${only.location} prices ${plural(only.routes, "route")} to it`
    : `${andList(pricedFrom.map((entry) => entry.location))} price routes to it`;
}
