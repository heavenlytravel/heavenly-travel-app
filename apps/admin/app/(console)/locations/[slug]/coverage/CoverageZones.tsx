"use client";

import Link from "next/link";
import { plural } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CoverageMap, type MappedZone } from "./CoverageMap";
import { ZoneList } from "./ZoneList";
import type { DistrictOutline } from "./zones/map-shapes";

/** A zone as the Coverage tab lists it. */
export type CoverageZone = MappedZone & {
  /** "The district Langkawi, as it is" */
  drawnAs: string;
  /** The priced routes the zone is an end of. */
  routes: number;
  href: string;
};

/**
 * The Coverage tab's map and list as one: every zone in its colour on the
 * map and in a row of the list, the zone pointed at in either lit in both.
 * A click on the map or the zone's name opens its editor. Without the
 * browser key the list stands alone. Read only, there is no editor and no
 * way to remove a zone.
 */
export function CoverageZones({
  locationId,
  mapKey,
  districts,
  zones,
  editable,
}: {
  locationId: string;
  mapKey: string | null;
  districts: DistrictOutline[];
  zones: CoverageZone[];
  /** Operation: each zone opens its editor and can be removed. */
  editable: boolean;
}) {
  const router = useRouter();
  const [highlighted, setHighlighted] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {mapKey ? (
        <CoverageMap
          mapKey={mapKey}
          districts={districts}
          zones={zones}
          highlighted={highlighted}
          onHighlight={setHighlighted}
          onOpen={(id) => {
            const zone = zones.find((entry) => entry.id === id);
            if (zone && editable) router.push(zone.href);
          }}
        />
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The map needs the browser key for Google Maps,
          NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY. A zone that is a district still
          works without it.
        </p>
      )}

      {zones.length > 0 ? (
        <ul aria-label="Zones" className="divide-y divide-neutral-100">
          {zones.map((zone) => {
            const lit = zone.id === highlighted;
            return (
              <li
                key={zone.id}
                onMouseEnter={() => setHighlighted(zone.id)}
                onMouseLeave={() => setHighlighted(null)}
                onFocus={() => setHighlighted(zone.id)}
                onBlur={() => setHighlighted(null)}
                className={cx(
                  "-mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-2 py-3 transition-colors",
                  lit && "bg-neutral-50",
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
                  {editable ? (
                    <Link
                      href={zone.href}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {zone.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{zone.name}</span>
                  )}
                  <span className="block text-xs text-neutral-500">
                    {zone.drawnAs}
                  </span>
                </div>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {zone.routes === 0
                    ? "No priced route"
                    : plural(zone.routes, "priced route")}
                </span>
                {editable ? (
                  <>
                    <Link
                      href={zone.href}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Edit
                    </Link>
                    <ZoneList
                      locationId={locationId}
                      zoneId={zone.id}
                      name={zone.name}
                      routes={zone.routes}
                    />
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
