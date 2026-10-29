"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LOCATION_STATE_LABELS,
  locationStateOf,
  type Permission,
} from "@repo/db";
import { LocationMark } from "@repo/console/LocationMark";
import { cx } from "@repo/ui/cx";
import { ChevronDownIcon, CirclePlusIcon } from "@repo/ui/icons";
import {
  Menu,
  MenuCheck,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "@repo/ui/menu";
import { pageShown, scopeSwitchHref } from "../_lib/console-map";
import { NEW_LOCATION_PATH, scopeSlugOf } from "../_lib/routes";

/** A location as the picker lists it. */
export type PickerLocation = {
  id: string;
  name: string;
  slug: string;
  state: string;
};

/**
 * The location picker, the console's only location control: at the head
 * of the top bar, and atop the menu's panel on a phone. It names the scope
 * the address starts with, every location or one. Picking another changes
 * the address's first segment and keeps the rest, the list's filters with
 * it: from /~/bookings?status=received to /langkawi/bookings?status=received.
 * A console-wide screen (Media, Team) is under All locations alone. See
 * docs/261029-manage-signature-overhaul.md, "How scope works".
 */
export function ScopePicker({
  locations,
  permissions,
  className,
}: {
  locations: readonly PickerLocation[];
  permissions: readonly Permission[];
  /** On its button: `w-full` atop the menu's panel on a phone. */
  className?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const scope = scopeSlugOf(pathname.split("/")[1] ?? "");
  const current =
    scope === null
      ? null
      : (locations.find((location) => location.slug === scope) ?? null);
  const hrefTo = (to: PickerLocation | null) =>
    scopeSwitchHref(pathname, search, to?.slug ?? null, (page) =>
      pageShown(page, {
        scope: to?.slug ?? null,
        permissions,
        state: to ? locationStateOf(to.state) : undefined,
      }),
    );

  return (
    <Menu
      label="Locations"
      className="w-72"
      trigger={
        <button
          type="button"
          aria-label={`Location: ${current?.name ?? "All locations"}`}
          className={cx(
            "flex h-11 min-w-0 shrink items-center gap-2.5 rounded-[10px] border border-edge bg-white pr-3 pl-2 text-left shadow-control outline-hidden transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-brand data-[state=open]:border-slate-300 md:min-w-56",
            className,
          )}
        >
          <ScopeMark location={current} />
          <span className="grid min-w-0 leading-tight">
            <span className="text-[11px] font-medium text-muted">Location</span>
            <span className="truncate text-sm font-semibold text-ink">
              {current?.name ?? "All locations"}
            </span>
          </span>
          <ChevronDownIcon className="ml-auto text-muted" />
        </button>
      }
    >
      <MenuItem asChild current={current === null}>
        <Link href={hrefTo(null)}>
          <ScopeMark location={null} small />
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
            <Link href={hrefTo(location)}>
              <LocationMark
                name={location.name}
                state={location.state}
                size="md"
              />
              <span className="min-w-0 flex-1 truncate">{location.name}</span>
              <span className="shrink-0 text-xs font-normal text-muted">
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
              <CirclePlusIcon className="text-muted" />
              Add location
            </Link>
          </MenuItem>
        </>
      ) : null}
    </Menu>
  );
}

/** The picker's mark: the location's, or "All" on brand blue for every location. */
function ScopeMark({
  location,
  small = false,
}: {
  location: PickerLocation | null;
  small?: boolean;
}) {
  if (location) {
    return (
      <LocationMark
        name={location.name}
        state={location.state}
        size={small ? "md" : "picker"}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center bg-brand font-bold text-white",
        small
          ? "size-5 rounded-[5px] text-[9px]"
          : "size-[26px] rounded-[7px] text-[11px]",
      )}
    >
      All
    </span>
  );
}
