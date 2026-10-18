"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@repo/ui/cx";
import {
  locationTabHref,
  locationTabOf,
  type LocationTab,
} from "../../../_lib/routes";

/**
 * The location's tabs as a strip under its header, on screens too narrow
 * for the panel's column, where the panel is a sheet: the sections stay
 * one tap away. From `xl` up the panel lists them and the strip is
 * hidden. The tab of the path on screen is marked.
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
    <nav aria-label="Location tabs" className="mt-6 xl:hidden">
      <ul className="-mx-5 flex gap-1 overflow-x-auto border-b border-neutral-200 px-5 md:mx-0 md:px-0">
        {tabs.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key} className="shrink-0">
              <Link
                href={locationTabHref(slug, tab.key)}
                aria-current={current ? "page" : undefined}
                className={cx(
                  "-mb-px block border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  current
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
