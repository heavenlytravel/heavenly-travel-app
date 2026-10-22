"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarLabel,
  useSidebarCollapsed,
} from "@repo/ui/sidebar";
import { useState, type ReactNode } from "react";
import {
  locationTabOf,
  type LocationTab,
  type LocationTabGroup,
} from "../../../_lib/routes";
import { StepMark } from "../_components/StepMark";
import { PublicPageLink } from "./PublicPageLink";

/** One row of a section's submenu: a zone, a class, a page, a status of the bookings. */
export type LocationNavItem = {
  key: string;
  label: string;
  href: string;
  /** What stands at the row's end: a count, a status, "Off sale". */
  note?: string;
  /** A disc before the label, for a page's standing or a class on sale. */
  dot?: "green" | "amber" | "grey";
};

/** A section of a location as the sidebar lists it: its tab, with one line on where it stands. */
export type LocationNavSection = {
  key: LocationTab;
  href: string;
  label: string;
  /** Where the section stands, one line: "2 classes on sale". The row's tooltip on the rail. */
  detail: string;
  /** What waits on the section, at its row's end: the bookings awaiting confirmation. None when nothing does. */
  count?: { value: number; tone: "brand" | "amber" };
  /** The setup step the section is and whether it is done; null off the setup, or once the location is live. */
  step: { number: number; done: boolean } | null;
  /** The section's icon, drawn when it is not a step. */
  icon: ReactNode;
  /** What the section holds, as the rows of its submenu; none for a section without one. */
  items: LocationNavItem[];
};

/** A group of the location's sections: the day's work, the setup, or the history at the end. */
export type LocationNavGroup = {
  key: LocationTabGroup;
  /** The group's heading: the location's name over its work; none for the end. */
  label: string | null;
  /** What stands at the heading's right: "2 of 4 done". */
  note?: string;
  /** Under the heading, above the rows: how far a draft's setup has come. */
  intro?: ReactNode;
  /** Folded under its heading until opened by hand or one of its tabs is on screen. */
  foldable: boolean;
  sections: LocationNavSection[];
};

const DOTS = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  grey: "bg-slate-300",
} as const;

const COUNT_TONES = {
  brand: "bg-brand text-white",
  amber: "bg-amber-100 text-amber-800",
} as const;

/** The path on screen with its query, as a submenu row's link is spelled. */
function useHere() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * The sections of a location in the sidebar, in their groups: the day's
 * work under the location's name, then the setup, then the history and
 * the public page. Each section is a row with its icon and, where
 * something waits on it, a count. A section with something to list (its
 * zones, its classes, its pages, its bookings by status) has a chevron
 * that opens it as a submenu; the section on screen opens by itself, and
 * a toggled one stays as it was left while the admin moves around the
 * location. A foldable group, the setup of a live location, works the
 * same way: folded under its heading, which names what it holds, it
 * opens by itself on one of its tabs. The row of the path on screen is
 * marked. While the location is a draft, each setup step's row carries
 * its number, ticked once the step is done. Collapsed to a rail, every
 * row is its mark or icon alone, groups unfolded, with the section's
 * line as its tooltip.
 */
export function LocationNavMenu({
  slug,
  groups,
  publicHref,
}: {
  /** The location's slug, its address. */
  slug: string;
  groups: readonly LocationNavGroup[];
  /** The location's public page; null while it is not public. */
  publicHref: string | null;
}) {
  const pathname = usePathname();
  const here = useHere();
  const active = locationTabOf(slug, pathname);
  const collapsed = useSidebarCollapsed();
  // The submenus and groups the admin opened or closed by hand; the rest
  // follow the tab on screen.
  const [toggled, setToggled] = useState<Partial<Record<LocationTab, boolean>>>(
    {},
  );
  const [unfolded, setUnfolded] = useState<
    Partial<Record<LocationTabGroup, boolean>>
  >({});
  // A tab opened inside a group folded by hand opens the group: the fold
  // is forgotten, and the group follows the tab on screen again.
  const [shownTab, setShownTab] = useState(active);
  if (active !== shownTab) {
    setShownTab(active);
    const holder = groups.find((group) =>
      group.sections.some((section) => section.key === active),
    );
    if (holder && unfolded[holder.key] === false) {
      setUnfolded((was) => {
        const rest = { ...was };
        delete rest[holder.key];
        return rest;
      });
    }
  }

  return (
    <nav aria-label="Location sections">
      {groups.map((group) => {
        const holdsActive = group.sections.some(
          (section) => section.key === active,
        );
        const open =
          collapsed || !group.foldable || (unfolded[group.key] ?? holdsActive);
        return (
          <SidebarGroup key={group.key}>
            {group.label && !collapsed ? (
              group.foldable ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() =>
                    setUnfolded((was) => ({ ...was, [group.key]: !open }))
                  }
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-slate-500 outline-hidden transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {group.label}
                  {group.note ? (
                    <span className="ml-auto font-normal">{group.note}</span>
                  ) : null}
                  <ChevronRightIcon
                    className={cx(
                      "size-4 shrink-0 transition-transform duration-150",
                      !group.note && "ml-auto",
                      open && "rotate-90",
                    )}
                  />
                </button>
              ) : (
                <SidebarGroupLabel className="justify-between gap-2">
                  <span className="truncate">{group.label}</span>
                  {group.note ? (
                    <span className="shrink-0 font-normal">{group.note}</span>
                  ) : null}
                </SidebarGroupLabel>
              )
            ) : null}
            {open ? (
              <>
                {collapsed ? null : group.intro}
                <SidebarMenu aria-label={group.label ?? undefined}>
                  {group.sections.map((section) => (
                    <SectionRow
                      key={section.key}
                      section={section}
                      current={section.key === active}
                      here={here}
                      open={
                        section.items.length > 0 &&
                        !collapsed &&
                        (toggled[section.key] ?? section.key === active)
                      }
                      onToggle={(next) =>
                        setToggled((was) => ({ ...was, [section.key]: next }))
                      }
                    />
                  ))}
                  {group.key === "foot" && publicHref ? (
                    <SidebarMenuItem>
                      <PublicPageLink href={publicHref} />
                    </SidebarMenuItem>
                  ) : null}
                </SidebarMenu>
                {group.key === "foot" && !publicHref && !collapsed ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500">
                    Not public yet. Staff read the pages through Preview.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="truncate px-2 pb-1 text-xs text-slate-400">
                {group.sections.map((section) => section.label).join(", ")}
              </p>
            )}
          </SidebarGroup>
        );
      })}
    </nav>
  );
}

/** One section's row, and its submenu when open. */
function SectionRow({
  section,
  current,
  here,
  open,
  onToggle,
}: {
  section: LocationNavSection;
  /** The section's tab is on screen. */
  current: boolean;
  /** The path on screen with its query, to mark a submenu row. */
  here: string;
  /** Its submenu is open. */
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const collapsed = useSidebarCollapsed();
  const hasItems = section.items.length > 0 && !collapsed;
  return (
    <SidebarMenuItem>
      {/* The row and its chevron, so the chevron centres on the row and not on the open submenu. */}
      <div className="relative">
        <SidebarMenuButton
          asChild
          active={current}
          tooltip={`${section.label}: ${section.detail}`}
        >
          <Link href={section.href} className={hasItems ? "pr-9" : undefined}>
            {section.step ? (
              <StepMark
                number={section.step.number}
                done={section.step.done}
                className={
                  current && !section.step.done
                    ? "border-brand text-brand"
                    : undefined
                }
              />
            ) : (
              section.icon
            )}
            <SidebarLabel className="min-w-0 flex-1">
              {section.label}
            </SidebarLabel>
            {section.count && !collapsed ? (
              <>
                <span
                  aria-hidden="true"
                  className={cx(
                    "shrink-0 rounded-full px-1.5 text-[11px] leading-[18px] font-semibold tabular-nums",
                    COUNT_TONES[section.count.tone],
                  )}
                >
                  {section.count.value}
                </span>
                <span className="sr-only">, {section.detail}</span>
              </>
            ) : null}
          </Link>
        </SidebarMenuButton>
        {hasItems ? (
          <SidebarMenuAction
            aria-expanded={open}
            aria-label={`${open ? "Close" : "Open"} ${section.label}`}
            onClick={() => onToggle(!open)}
            className={
              current
                ? "text-navy/70 hover:bg-brand/10 hover:text-navy"
                : undefined
            }
          >
            <ChevronRightIcon
              className={cx(
                "transition-transform duration-150",
                open && "rotate-90",
              )}
            />
          </SidebarMenuAction>
        ) : null}
      </div>
      {open ? (
        <SidebarMenuSub aria-label={section.label}>
          {section.items.map((item) => (
            <SidebarMenuSubItem key={item.key}>
              <SidebarMenuSubButton asChild active={item.href === here}>
                <Link href={item.href}>
                  {item.dot ? (
                    <span
                      aria-hidden="true"
                      className={cx(
                        "size-1.5 shrink-0 rounded-full",
                        DOTS[item.dot],
                      )}
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.note ? (
                    <span className="max-w-[60%] shrink-0 truncate text-xs text-slate-500 tabular-nums">
                      {item.note}
                    </span>
                  ) : null}
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}
