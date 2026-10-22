"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LOCATION_STATE_LABELS,
  locationStateOf,
  type Permission,
} from "@repo/db";
import { ChevronDownIcon, CirclePlusIcon, MapIcon } from "@repo/ui/icons";
import {
  Menu,
  MenuCheck,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "@repo/ui/menu";
import {
  NEW_LOCATION_PATH,
  locationTabsMayOpen,
  scopeSwitchHref,
} from "../_lib/routes";
import type { SidebarLocation } from "./AppSidebar";
import { useConsoleScope } from "./ConsoleScope";
import { LocationMark } from "./LocationMark";
import { LocationStateBadge } from "./StatusBadges";

/**
 * The location picker at the head of the console header: the scope the
 * sidebar lists, one location or all of them. Its menu holds All
 * locations, every location with its state, and Add location for
 * Marketing. Picking keeps the section on screen where the other scope
 * has it: from Langkawi's Rates to Penang's, from a location's Bookings to
 * the queue across locations. See docs/261022-console-scope.md.
 */
export function ScopePicker({
  locations,
  permissions,
}: {
  locations: readonly SidebarLocation[];
  permissions: readonly Permission[];
}) {
  const pathname = usePathname();
  const scope = useConsoleScope();
  const current =
    scope === "all"
      ? null
      : (locations.find((location) => location.slug === scope.slug) ?? null);
  const tabsOf = (slug: string) => {
    const location = locations.find((entry) => entry.slug === slug);
    if (!location) return [];
    return locationTabsMayOpen(
      locationStateOf(location.state),
      permissions,
    ).map((tab) => tab.key);
  };

  return (
    <Menu
      label="Locations"
      className="w-64"
      trigger={
        <button
          type="button"
          aria-label={`Location: ${current?.name ?? "All locations"}`}
          className="flex h-9 min-w-0 shrink items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-900 outline-hidden transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand data-[state=open]:border-slate-300 data-[state=open]:bg-slate-50"
        >
          {current ? (
            <LocationMark name={current.name} state={current.state} size="md" />
          ) : (
            <MapIcon className="text-slate-500" />
          )}
          <span className="truncate">{current?.name ?? "All locations"}</span>
          {current ? (
            <span className="hidden sm:inline-flex">
              <LocationStateBadge state={current.state} />
            </span>
          ) : null}
          <ChevronDownIcon className="text-slate-500" />
        </button>
      }
    >
      <MenuItem asChild current={current === null}>
        <Link href={scopeSwitchHref(pathname, "all", tabsOf)}>
          <MapIcon className="text-slate-500" />
          All locations
          {current === null ? <MenuCheck /> : null}
        </Link>
      </MenuItem>
      <MenuSeparator />
      <MenuLabel>Locations</MenuLabel>
      {locations.map((location) => {
        const here = location.slug === current?.slug;
        return (
          <MenuItem key={location.id} asChild current={here}>
            <Link
              href={scopeSwitchHref(pathname, { slug: location.slug }, tabsOf)}
            >
              <LocationMark
                name={location.name}
                state={location.state}
                size="md"
              />
              <span className="min-w-0 flex-1 truncate">{location.name}</span>
              <span className="shrink-0 text-xs font-normal text-slate-500">
                {LOCATION_STATE_LABELS[locationStateOf(location.state)]}
              </span>
              {here ? <MenuCheck /> : null}
            </Link>
          </MenuItem>
        );
      })}
      {permissions.includes("locations.manage") ? (
        <>
          <MenuSeparator />
          <MenuItem asChild current={pathname === NEW_LOCATION_PATH}>
            <Link href={NEW_LOCATION_PATH}>
              <CirclePlusIcon className="text-slate-500" />
              Add location
            </Link>
          </MenuItem>
        </>
      ) : null}
    </Menu>
  );
}
