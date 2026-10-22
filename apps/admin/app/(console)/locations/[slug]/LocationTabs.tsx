"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cx } from "@repo/ui/cx";
import {
  locationTabHref,
  locationTabOf,
  type LocationTab,
} from "../../../_lib/routes";

/**
 * The location's tabs as a strip under its header, on a phone, where the
 * sidebar that lists them is a sheet: the sections stay one tap away.
 * From `md` up the sidebar is on screen and the strip is hidden. The tab of the path on screen is marked. The strip scrolls
 * sideways with no bar, as the customer site's service tabs do, and keeps
 * the marked tab in view.
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
  const strip = useRef<HTMLUListElement>(null);

  // Only the strip scrolls, not the page, so the console's own scroll to
  // the top of a new tab stands.
  useEffect(() => {
    const list = strip.current;
    const tab = list?.querySelector('[aria-current="page"]');
    if (!list || !tab) return;
    const view = list.getBoundingClientRect();
    const box = tab.getBoundingClientRect();
    if (box.left < view.left) list.scrollLeft -= view.left - box.left;
    else if (box.right > view.right) list.scrollLeft += box.right - view.right;
  }, [active]);

  return (
    <nav aria-label="Location tabs" className="mt-6 md:hidden">
      <ul
        ref={strip}
        className="-mx-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-5 [scrollbar-width:none] md:mx-0 md:px-0"
      >
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
                    ? "border-brand text-brand"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
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
