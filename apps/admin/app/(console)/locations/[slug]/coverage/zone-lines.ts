import {
  isZoneCircle,
  isZoneCopy,
  isZoneDistrict,
  isZoneReshaped,
  isZoneShape,
  plural,
  ringsOf,
} from "@repo/db";

/**
 * How the coverage screens describe a zone: how it was made, and how many
 * priced routes it is an end of. The Coverage tab and the Coverage screen
 * across locations both read these.
 */

/** "km" with one decimal at most: 1.5, 25. */
const kmOf = (metres: number) => {
  const km = metres / 1000;
  return km % 1 === 0 ? String(km) : km.toFixed(1);
};

/**
 * How a zone was made, in a line: where it started, and its corners when
 * drawn; a destination says so first.
 */
export function drawnAs(zone: {
  shape: unknown;
  drawnFrom: unknown;
  takesPickups: boolean;
}) {
  const made = madeFrom(zone);
  return zone.takesPickups ? made : `Drop-offs only · ${made}`;
}

function madeFrom(zone: { shape: unknown; drawnFrom: unknown }) {
  if (isZoneCopy(zone.drawnFrom)) return `Copied from ${zone.drawnFrom.label}`;
  if (isZoneDistrict(zone.drawnFrom)) {
    return `The district ${zone.drawnFrom.label}, as it is`;
  }
  if (isZoneReshaped(zone.drawnFrom)) {
    return `Reshaped from the district ${zone.drawnFrom.label}`;
  }
  if (isZoneCircle(zone.drawnFrom)) {
    return `Started as a ${kmOf(zone.drawnFrom.radiusM)} km circle around ${zone.drawnFrom.label}`;
  }
  const corners = isZoneShape(zone.shape)
    ? ringsOf(zone.shape).reduce((sum, ring) => sum + ring.length - 1, 0)
    : 0;
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
