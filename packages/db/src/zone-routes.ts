import type { DeleteImpact } from "./delete-impact";
import { plural } from "./names";

/**
 * The priced routes each zone is an end of, counted from a grid's cells,
 * pure and browser-safe: this location's own, and other locations' routes
 * out to it, such as Kuala Lumpur's to Selangor's KLIA. A route priced for
 * several classes counts once. The coverage screens and the zone removal
 * count them the same way, so the removal's warning and its check agree.
 */

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

/** The other locations that price routes to a zone, each with how many, by name. */
export type PricedFrom = { location: string; routes: number }[];

/**
 * The other locations whose grids end at each zone, by the zone's id: their
 * routes out, which go when the zone is removed.
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

/**
 * What removing a zone takes (./delete-impact): its priced routes on the
 * location's grid, its pickups unless another zone holds them, and the
 * routes other locations price to it. Those last reach past the location,
 * so the zone's name is typed to confirm.
 */
export function zoneDeleteImpact(
  zone: { name: string },
  routes: number,
  pricedFrom: PricedFrom,
): DeleteImpact {
  return {
    lines: [
      ...(routes > 0
        ? [
            routes === 1
              ? "Its priced route on the rate grid goes with it."
              : `Its ${plural(routes, "priced route")} on the rate grid go with it.`,
          ]
        : []),
      "A pickup there is no longer served, unless another zone holds it.",
      ...pricedFrom.map(
        (entry) =>
          `${entry.location} loses ${entry.routes === 1 ? "its route" : `its ${plural(entry.routes, "route")}`} to it and stops selling ${entry.routes === 1 ? "that trip" : "those trips"}.`,
      ),
    ],
    confirmWith: pricedFrom.length > 0 ? zone.name : null,
  };
}
