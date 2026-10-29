"use client";

import Link from "next/link";
import { plural, type PricedFrom } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CARD_LINK, Card, CardTitle } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { LocationMark } from "@repo/console/LocationMark";
import { Notice } from "@repo/console/Notice";
import { DetailColumns } from "@repo/console/PageColumn";
import { LocationStateBadge } from "@repo/console/StatusBadges";
import { CoverageMap, type MappedZone } from "./CoverageMap";
import { RemoveZone } from "./RemoveZone";
import { pricedFromSentence } from "./zone-lines";
import type { DistrictOutline } from "./zones/map-shapes";

/** A zone as Coverage lists it. */
export type CoverageZone = MappedZone & {
  /** "The district Langkawi, as it is" */
  drawnAs: string;
  /** The priced routes the zone is an end of. */
  routes: number;
  /** The other locations whose grids end at the zone. */
  pricedFrom: PricedFrom;
  /** Where its row and its shape on the map lead: its editor, or its location's Coverage; none for a zone only read. */
  href: string | null;
  /** Operation under the zone's location: Edit and Remove on its row. */
  editable: boolean;
};

/** The zones of one location; under `~` the list groups them under the location's name. */
export type CoverageGroup = {
  id: string;
  /** The location, named over its zones under `~`; none under the location itself. */
  location?: { name: string; state: string; href: string };
  zones: CoverageZone[];
};

/**
 * Coverage's map and list as one, side by side on a wide screen and the
 * map first on a phone: every zone in its colour on the map and in a row
 * of the list, the zone pointed at in either lit in both. A click on a
 * zone on the map or on its name opens where it leads. Under a location
 * each row of Operation's has Edit and Remove; under `~` the rows are
 * grouped by location, each location named over its zones. Without the
 * browser key the map's card says so and the list stands alone.
 */
export function CoverageZones({
  mapKey,
  districts,
  mapTitle,
  mapMeta,
  listTitle,
  groups,
  emptyMessage,
  foot,
}: {
  mapKey: string | null;
  districts: DistrictOutline[];
  /** The map card's name: the location's, or every location's. */
  mapTitle: ReactNode;
  /** A short note beside it: "7 zones within Kedah". */
  mapMeta: string;
  /** The list card's name, with its info tip. */
  listTitle: ReactNode;
  groups: CoverageGroup[];
  /** What the list says with no zone and no location to show. */
  emptyMessage: string;
  /** A line at the list's foot: the way on to the rate grid. */
  foot?: ReactNode;
}) {
  const router = useRouter();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const zones = groups.flatMap((group) => group.zones);
  const grouped = groups.some((group) => group.location);

  const map = (
    <Card flush>
      <CardTitle inset meta={mapMeta}>
        {mapTitle}
      </CardTitle>
      {mapKey ? (
        <CoverageMap
          mapKey={mapKey}
          districts={districts}
          zones={zones}
          highlighted={highlighted}
          onHighlight={setHighlighted}
          onOpen={(id) => {
            const zone = zones.find((entry) => entry.id === id);
            if (zone?.href) router.push(zone.href);
          }}
        />
      ) : (
        <Notice className="m-5">
          The map needs the browser key for Google Maps,
          NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY. A zone that is a district still
          works without it.
        </Notice>
      )}
    </Card>
  );

  const rows = (list: CoverageZone[], label: string) => (
    <ul aria-label={label} className="divide-y divide-hairline">
      {list.map((zone) => (
        <ZoneRow
          key={zone.id}
          zone={zone}
          lit={zone.id === highlighted}
          onHighlight={setHighlighted}
        />
      ))}
    </ul>
  );

  const list = (
    <Card flush>
      <CardTitle inset meta={zones.length > 0 ? zones.length : undefined}>
        {listTitle}
      </CardTitle>
      {groups.length === 0 || (!grouped && zones.length === 0) ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : grouped ? (
        groups.map((group) => (
          <section
            key={group.id}
            aria-label={group.location?.name}
            className="border-b border-hairline last:border-b-0"
          >
            {group.location ? (
              <h3 className="flex flex-wrap items-center gap-2 border-b border-hairline bg-shade px-5 py-2.5 text-sm font-semibold text-ink">
                <LocationMark
                  name={group.location.name}
                  state={group.location.state}
                />
                <Link
                  href={group.location.href}
                  className="underline-offset-4 hover:underline"
                >
                  {group.location.name}
                </Link>
                <LocationStateBadge state={group.location.state} />
                <span className="text-caption font-normal text-muted">
                  {group.zones.length === 0
                    ? "No zone yet, so no pickup is served"
                    : plural(group.zones.length, "zone")}
                </span>
              </h3>
            ) : null}
            {group.zones.length > 0
              ? rows(
                  group.zones,
                  group.location ? `Zones of ${group.location.name}` : "Zones",
                )
              : null}
          </section>
        ))
      ) : (
        rows(zones, "Zones")
      )}
      {foot ? (
        <p className="border-t border-hairline px-5 py-3 text-caption text-muted">
          {foot}
        </p>
      ) : null}
    </Card>
  );

  return <DetailColumns main={map} side={list} />;
}

/** One zone of the list: its colour, its name and how it was made, its priced routes, and Edit and Remove for Operation. */
function ZoneRow({
  zone,
  lit,
  onHighlight,
}: {
  zone: CoverageZone;
  lit: boolean;
  onHighlight: (id: string | null) => void;
}) {
  return (
    <li
      onMouseEnter={() => onHighlight(zone.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(zone.id)}
      onBlur={() => onHighlight(null)}
      className={cx(
        "flex items-start gap-3 px-5 py-3 transition-colors",
        lit && "bg-hover",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "mt-1 size-3 shrink-0 rounded-sm border transition-transform",
          lit && "scale-125",
        )}
        style={{
          backgroundColor: `${zone.color}40`,
          borderColor: zone.color,
        }}
      />
      <div className="min-w-0 flex-1">
        {zone.href ? (
          <Link
            href={zone.href}
            className="text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            {zone.name}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-ink">{zone.name}</span>
        )}
        <span className="block text-caption text-muted">{zone.drawnAs}</span>
        {zone.pricedFrom.length > 0 ? (
          <span className="block text-caption text-muted">
            {pricedFromSentence(zone.pricedFrom)}
          </span>
        ) : null}
      </div>
      <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
        <span className="text-caption font-semibold whitespace-nowrap text-body tabular-nums">
          {zone.routes === 0
            ? "No priced route"
            : plural(zone.routes, "priced route")}
        </span>
        {zone.editable && zone.href ? (
          <span className="flex items-center gap-1">
            <Link
              href={zone.href}
              aria-label={`Edit the zone ${zone.name}`}
              className={CARD_LINK}
            >
              Edit
            </Link>
            <RemoveZone
              zoneId={zone.id}
              name={zone.name}
              routes={zone.routes}
              pricedFrom={zone.pricedFrom}
            />
          </span>
        ) : null}
      </div>
    </li>
  );
}
