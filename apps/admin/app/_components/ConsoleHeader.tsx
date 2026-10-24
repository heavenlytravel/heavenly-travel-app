"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import type { Permission } from "@repo/db";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import { NavigationProgress } from "@repo/ui/navigation-progress";
import { SidebarTrigger } from "@repo/ui/sidebar";
import {
  LOCATION_TABS,
  NEW_LOCATION_PATH,
  locationSlugOf,
  locationTabHref,
  locationTabOf,
} from "../_lib/routes";
import type { SidebarLocation } from "./AppSidebar";
import { SearchBox } from "./ConsoleSearch";
import { sectionOnScreen } from "./nav";
import { ScopePicker } from "./ScopePicker";

/** The section on screen, for the trail after the picker: a location's tab, or a section of the console. */
function sectionOf(pathname: string): { label: string; href: string } | null {
  const slug = locationSlugOf(pathname);
  if (slug !== null) {
    const tab = locationTabOf(slug, pathname);
    const label = LOCATION_TABS.find((entry) => entry.key === tab)?.label;
    return label ? { label, href: locationTabHref(slug, tab) } : null;
  }
  if (pathname === NEW_LOCATION_PATH) {
    return { label: "Add location", href: NEW_LOCATION_PATH };
  }
  return sectionOnScreen(pathname) ?? null;
}

/**
 * The bar above every console page. On the left the sidebar's toggle,
 * the location picker, which sets the scope the sidebar lists, and the
 * section on screen: "Langkawi / Rates", a link back to the section from
 * a record inside it. On the right the search, which opens the command
 * palette over every page and record the admin may open, and the
 * signed-in admin's own menu. On a phone the toggle and the search are
 * in the dock at the screen's foot instead.
 * See docs/261022-console-scope.md and docs/261023-console-sidebar.md.
 */
export function ConsoleHeader({
  locations,
  permissions,
}: {
  locations: readonly SidebarLocation[];
  permissions: readonly Permission[];
}) {
  const pathname = usePathname();
  const section = sectionOf(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
      <NavigationProgress
        className="absolute inset-x-0 top-0"
        gradient={["var(--navy)", "var(--azure)"]}
      />
      <SidebarTrigger className="-ml-1 max-md:hidden" />
      <span
        aria-hidden="true"
        className="mx-1 h-4 w-px bg-slate-200 max-md:hidden"
      />
      <ScopePicker locations={locations} permissions={permissions} />
      {section ? (
        <nav
          aria-label="Breadcrumb"
          className="hidden min-w-0 items-center gap-2 text-sm md:flex"
        >
          <span aria-hidden="true" className="text-slate-300">
            /
          </span>
          {section.href === pathname ? (
            <span
              aria-current="page"
              className="truncate font-medium text-slate-900"
            >
              {section.label}
            </span>
          ) : (
            <Link
              href={section.href}
              className="truncate text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              {section.label}
            </Link>
          )}
        </nav>
      ) : null}
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3 pl-2">
        <SearchBox />
        {/* The box holds the button's place while Clerk loads, so the bar does not shift. */}
        <span className="flex size-7 shrink-0 items-center justify-center">
          <UserButton appearance={clerkUserButton} />
        </span>
      </div>
    </header>
  );
}
