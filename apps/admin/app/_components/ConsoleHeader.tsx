"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationProgress } from "@repo/ui/navigation-progress";
import { SidebarPanelTrigger, SidebarTrigger } from "@repo/ui/sidebar";
import {
  LOCATION_TABS,
  locationHref,
  locationSlugOf,
  locationTabOf,
} from "../_lib/routes";
import type { SidebarLocation } from "./AppSidebar";
import { currentNav } from "./nav";

/**
 * The bar above every console page: the sidebar toggle and where you are.
 * Inside a location the trail goes on with the location's name and the
 * tab on screen: "Locations / Langkawi / Coverage", and on
 * screens too narrow for the location's panel a button at the right end
 * opens it as a sheet.
 */
export function ConsoleHeader({
  locations,
}: {
  locations: readonly SidebarLocation[];
}) {
  const pathname = usePathname();
  const section = currentNav(pathname);
  const slug = locationSlugOf(pathname);
  const location = slug ? locations.find((entry) => entry.slug === slug) : null;
  const tab = slug ? locationTabOf(slug, pathname) : null;
  const tabLabel =
    tab && tab !== "overview"
      ? LOCATION_TABS.find((entry) => entry.key === tab)?.label
      : null;

  const trail: { label: string; href?: string }[] = [
    { label: section?.label ?? "Console", href: section?.href },
  ];
  if (location) {
    trail.push({ label: location.name, href: locationHref(location.slug) });
  }
  if (tabLabel) trail.push({ label: tabLabel });

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
      <NavigationProgress
        className="absolute inset-x-0 top-0"
        gradient={["var(--navy)", "var(--azure)"]}
      />
      <SidebarTrigger className="-ml-1" />
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-slate-200" />
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-sm"
      >
        <span className="hidden text-slate-500 md:inline">Admin</span>
        <span aria-hidden="true" className="hidden text-slate-300 md:inline">
          /
        </span>
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <span key={crumb.label} className="flex min-w-0 items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
              ) : null}
              {last || !crumb.href ? (
                <span
                  className={`truncate ${last ? "font-medium text-slate-900" : "text-slate-500"}`}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      {slug ? (
        <SidebarPanelTrigger
          aria-label="Toggle location panel"
          className="-mr-1 ml-auto"
        />
      ) : null}
    </header>
  );
}
