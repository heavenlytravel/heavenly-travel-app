"use client";

import { usePathname } from "next/navigation";
import { LinkTabs } from "../../../_components/LinkTabs";
import {
  locationTabHref,
  locationTabOf,
  type LocationTab,
} from "../../../_lib/routes";

/**
 * The location's tabs as a strip under its header, on a phone, where the
 * sidebar that lists them is a sheet: the sections stay one tap away, in
 * the sidebar's order, the history last, where the sidebar opens it from
 * Settings. From `md` up the sidebar is on screen and the strip is hidden.
 * The tab of the path on screen is marked.
 */
export function LocationTabs({
  slug,
  tabs,
}: {
  /** The location's slug, its address. */
  slug: string;
  /** The tabs the admin may open, in their order. */
  tabs: readonly { key: LocationTab; label: string }[];
}) {
  const active = locationTabOf(slug, usePathname());
  return (
    <LinkTabs
      label="Location tabs"
      className="mt-6 md:hidden"
      tabs={tabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        href: locationTabHref(slug, tab.key),
        current: tab.key === active,
      }))}
    />
  );
}
