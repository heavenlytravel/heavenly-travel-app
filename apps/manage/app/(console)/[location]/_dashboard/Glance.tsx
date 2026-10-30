import {
  andList,
  isPagePublished,
  locationStateOf,
  plural,
  tripRulesLabel,
  tripRulesOf,
  type Permission,
} from "@repo/db";
import type { LocationName, LocationOverview } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card, CardRows, CardTitle } from "@repo/console/Card";
import { MENU_ICONS, type MenuIcon } from "../../../_components/menu";
import {
  consolePage,
  pageHref,
  pageShown,
  type MenuFor,
} from "../../../_lib/console-map";
import {
  locationDetails,
  locationOfferings,
  locationZoneNames,
} from "../../../_lib/location-data";
import { ActionRow, IconMark, RowEnd } from "./ActionRow";

/** One part of a location at a glance: where it is, in a line, and the page that holds it. */
export type GlanceRow = {
  key: string;
  label: string;
  icon: MenuIcon;
  href: string;
  line: string;
};

/**
 * A live location's parts in a line each, for a team with no queue to
 * work, such as Marketing: what it sells, its coverage, its rates, its
 * pages and its settings, each only for an admin who may open its page,
 * in the menu's order.
 */
export async function glanceOf(
  location: LocationName,
  overview: LocationOverview,
  permissions: readonly Permission[],
): Promise<GlanceRow[]> {
  const at: MenuFor = {
    scope: location.slug,
    permissions,
    state: locationStateOf(location.state),
  };
  const shown = (key: string) => pageShown(consolePage(key), at);
  // The classes, the coverage and the rates are read for those who see them.
  const operates = shown("coverage");
  const [details, zones, offerings] = await Promise.all([
    locationDetails(location.id),
    operates ? locationZoneNames(location.id) : [],
    operates ? locationOfferings(location.id) : [],
  ]);
  if (!details) notFound();

  const onSale = offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  const off = offerings.length - onSale.length;
  // Every pair of zones, and each zone with itself: its within-zone price.
  const pairs = (overview.zones * (overview.zones + 1)) / 2;
  const pages = overview.pages.filter((page) => page.slug === "");
  const published = pages.filter((page) => isPagePublished(page.status));
  const changed = pages.filter((page) => page.status === "changed");

  const rows: (Omit<GlanceRow, "href" | "label" | "icon"> & {
    label?: string;
    icon?: MenuIcon;
  })[] = [
    {
      key: "classes",
      line:
        offerings.length === 0
          ? "Nothing sold here yet"
          : `${plural(onSale.length, "class", "classes")} on sale${off > 0 ? `, ${off} off` : ""}`,
    },
    {
      key: "coverage",
      line:
        zones.length === 0
          ? "No zone yet, so no pickup is served"
          : `${plural(zones.length, "zone")}: ${zones.map((zone) => zone.name).join(", ")}`,
    },
    {
      key: "rates-classes",
      label: "Rates",
      icon: "rates",
      line: [
        pairs === 0
          ? "Needs a zone"
          : `${overview.routesPriced} of ${plural(pairs, "route")} priced`,
        `rules: ${tripRulesLabel(tripRulesOf(details)).toLowerCase()}`,
      ].join(" · "),
    },
    {
      key: "pages",
      line: [
        `${published.length} of ${pages.length} published`,
        changed.length > 0 ? `${changed.length} with edits waiting` : null,
        plural(details.addresses.length, "saved address", "saved addresses"),
      ]
        .filter((part) => part !== null)
        .join(" · "),
    },
    {
      key: "settings",
      line: [
        andList(overview.stateNames) || "No state yet",
        overview.topChoiceOrder === null
          ? null
          : `Top choice ${overview.topChoiceOrder}`,
      ]
        .filter((part) => part !== null)
        .join(" · "),
    },
  ];
  return rows
    .filter((row) => shown(row.key))
    .map((row) => {
      const page = consolePage(row.key);
      return {
        ...row,
        label: row.label ?? page.label,
        icon: row.icon ?? page.icon,
        href: pageHref(page, location.slug),
      };
    });
}

/** A location's parts at a glance, a line each and a way in. */
export function Glance({ rows }: { rows: readonly GlanceRow[] }) {
  return (
    <Card flush className="overflow-hidden">
      <CardTitle inset>At a glance</CardTitle>
      <CardRows>
        {rows.map((row) => {
          const Icon = MENU_ICONS[row.icon];
          return (
            <ActionRow
              key={row.key}
              href={row.href}
              mark={
                <IconMark tone="neutral">
                  <Icon />
                </IconMark>
              }
              title={row.label}
              line={row.line}
              end={<RowEnd />}
            />
          );
        })}
      </CardRows>
    </Card>
  );
}
