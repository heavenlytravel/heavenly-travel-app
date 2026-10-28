"use client";

import Link from "next/link";
import { plural } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocationMark } from "../../_components/LocationMark";
import { LocationStateBadge } from "../../_components/StatusBadges";
import {
  CoverageMap,
  type MappedZone,
} from "../locations/[slug]/coverage/CoverageMap";
import type { DistrictOutline } from "../locations/[slug]/coverage/zones/map-shapes";

/** A zone as the screen lists it, under its location. */
export type AcrossZone = MappedZone & {
  /** "The district Langkawi, as it is" */
  drawnAs: string;
  /** The priced routes the zone is an end of. */
  routes: number;
  /** Its editor for Operation, its location's Coverage tab for the teams that read. */
  href: string;
};

/** A location with its zones, as the list groups them. */
export type AcrossLocation = {
  id: string;
  name: string;
  state: string;
  /** Its Coverage tab. */
  href: string;
  zones: AcrossZone[];
};

/**
 * Every location's zones on one map, each location in its colour, and
 * the list of them grouped by location beside it; narrowed to one
 * location, each zone in its own colour, as the location's tab draws
 * them. The zone pointed at, on the map or in the list, is lit in both; a
 * click opens it. Without the browser key the list stands alone.
 */
export function CoverageAcross({
  mapKey,
  districts,
  locations,
}: {
  mapKey: string | null;
  districts: DistrictOutline[];
  locations: AcrossLocation[];
}) {
  const router = useRouter();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const zones = locations.flatMap((location) => location.zones);

  return (
    <div className="grid gap-6">
      {mapKey ? (
        <CoverageMap
          mapKey={mapKey}
          districts={districts}
          zones={zones}
          highlighted={highlighted}
          onHighlight={setHighlighted}
          onOpen={(id) => {
            const zone = zones.find((entry) => entry.id === id);
            if (zone) router.push(zone.href);
          }}
        />
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The map needs the browser key for Google Maps,
          NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY.
        </p>
      )}

      {locations.map((location) => (
        <section key={location.id} aria-label={location.name}>
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <LocationMark name={location.name} state={location.state} />
            <Link
              href={location.href}
              className="underline-offset-4 hover:underline"
            >
              {location.name}
            </Link>
            <LocationStateBadge state={location.state} />
            <span className="font-normal text-slate-500">
              {location.zones.length === 0
                ? "No zone yet, so no pickup is served"
                : plural(location.zones.length, "zone")}
            </span>
          </h3>
          {location.zones.length > 0 ? (
            <ul
              aria-label={`Zones of ${location.name}`}
              className="mt-2 divide-y divide-slate-100"
            >
              {location.zones.map((zone) => {
                const lit = zone.id === highlighted;
                return (
                  <li
                    key={zone.id}
                    onMouseEnter={() => setHighlighted(zone.id)}
                    onMouseLeave={() => setHighlighted(null)}
                    onFocus={() => setHighlighted(zone.id)}
                    onBlur={() => setHighlighted(null)}
                    className={cx(
                      "-mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-2.5 transition-colors",
                      lit && "bg-slate-50",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "size-3 shrink-0 rounded-sm border transition-transform",
                        lit && "scale-125",
                      )}
                      style={{
                        backgroundColor: `${zone.color}40`,
                        borderColor: zone.color,
                      }}
                    />
                    <div className="min-w-40 flex-1">
                      <Link
                        href={zone.href}
                        className="text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {zone.name}
                      </Link>
                      <span className="block text-xs text-slate-500">
                        {zone.drawnAs}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {zone.routes === 0
                        ? "No priced route"
                        : plural(zone.routes, "priced route")}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
