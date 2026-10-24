"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cx } from "@repo/ui/cx";

export type LinkTab = {
  key: string;
  label: string;
  href: string;
  /** The tab of the page on screen. */
  current: boolean;
};

/**
 * A row of tabs that are links, each a page of its own, the one on screen
 * underlined: a location's tabs on a phone, the vehicles and their classes.
 * Too many for the width, the row scrolls sideways with no bar, as the
 * customer site's service tabs do, and keeps the current tab in view.
 */
export function LinkTabs({
  label,
  tabs,
  className,
}: {
  /** The row's name for assistive technology. */
  label: string;
  tabs: readonly LinkTab[];
  className?: string;
}) {
  const strip = useRef<HTMLUListElement>(null);
  const current = tabs.find((tab) => tab.current)?.key;

  // Only the row scrolls, not the page, so the console's own scroll to
  // the top of a new page stands.
  useEffect(() => {
    const list = strip.current;
    const tab = list?.querySelector('[aria-current="page"]');
    if (!list || !tab) return;
    const view = list.getBoundingClientRect();
    const box = tab.getBoundingClientRect();
    if (box.left < view.left) list.scrollLeft -= view.left - box.left;
    else if (box.right > view.right) list.scrollLeft += box.right - view.right;
  }, [current]);

  return (
    <nav aria-label={label} className={className}>
      <ul
        ref={strip}
        className="-mx-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-5 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {tabs.map((tab) => (
          <li key={tab.key} className="shrink-0">
            <Link
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={cx(
                "-mb-px block border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                tab.current
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
