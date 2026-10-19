"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebarCollapsed,
  useSidebarPanel,
} from "@repo/ui/sidebar";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  locationTabOf,
  type LocationTab,
  type LocationTabGroup,
} from "../../../_lib/routes";
import { StepMark } from "../_components/StepMark";

/** One row of a section's submenu: a zone, a class, a page, a status of the bookings. */
export type PanelItem = {
  key: string;
  label: string;
  href: string;
  /** What stands at the row's end: a count, a status, "Off sale". */
  note?: string;
  /** A disc before the label, for a page's standing or a class on sale. */
  dot?: "green" | "amber" | "grey";
};

/** A section of a location as the panel lists it: its tab, with one line on where it stands. */
export type PanelSection = {
  key: LocationTab;
  href: string;
  label: string;
  /** Where the section stands, one line: "2 classes on sale". */
  detail: string;
  /** The setup step the section is and whether it is done; null off the setup, or once the location is live. */
  step: { number: number; done: boolean } | null;
  /** The section's icon, drawn when it is not a step. */
  icon: ReactNode;
  /** What the section holds, as the rows of its submenu; none for a section without one. */
  items: PanelItem[];
};

/** A group of the panel's sections: the day's work, or the setup. */
export type PanelGroup = {
  key: Exclude<LocationTabGroup, "foot">;
  /** The group's heading; null for a draft's overview, which stands alone on top. */
  label: string | null;
  /** What stands at the heading's right: "2 of 4 done". */
  note?: string;
  /** Under the heading, above the rows: how far a draft's setup has come. */
  intro?: ReactNode;
  /** Folded under its heading until opened by hand or one of its tabs is on screen. */
  foldable: boolean;
  sections: PanelSection[];
};

const DOTS = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  grey: "bg-neutral-300",
} as const;

/** The path on screen with its query, as a submenu row's link is spelled. */
function useHere() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * The sections of a location in the panel beside its page, in their
 * groups: the day's work on top, then the setup. Each section is a row
 * of two lines: the tab's name and where it stands. A section with
 * something to list (its zones, its classes, its pages, its bookings by
 * status) has a chevron that opens it as a submenu; the section on screen
 * opens by itself, and a toggled one stays as it was left while the admin
 * moves around the location. A foldable group, the setup of a live
 * location, works the same way: folded under its heading, which names
 * what it holds, it opens by itself on one of its tabs. The row of the
 * path on screen is marked. While the location is a draft, each setup
 * step's row carries its number, ticked once the step is done. Collapsed
 * to a rail, every row is its mark or icon alone, groups unfolded. On
 * narrow screens the panel is a sheet; a move to another path, from any
 * link in it, closes the sheet.
 */
export function LocationPanelNav({
  slug,
  groups,
}: {
  /** The location's slug, its address. */
  slug: string;
  groups: readonly PanelGroup[];
}) {
  const pathname = usePathname();
  const here = useHere();
  const active = locationTabOf(slug, pathname);
  const { setOpen } = useSidebarPanel();
  const collapsed = useSidebarCollapsed();
  // The submenus and groups the admin opened or closed by hand; the rest
  // follow the tab on screen.
  const [toggled, setToggled] = useState<Partial<Record<LocationTab, boolean>>>(
    {},
  );
  const [unfolded, setUnfolded] = useState<
    Partial<Record<PanelGroup["key"], boolean>>
  >({});
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <nav aria-label="Location sections">
      {groups.map((group, index) => {
        const holdsActive = group.sections.some(
          (section) => section.key === active,
        );
        const open =
          collapsed || !group.foldable || (unfolded[group.key] ?? holdsActive);
        return (
          <Fragment key={group.key}>
            {index > 0 ? <SidebarSeparator /> : null}
            <SidebarGroup>
              {group.label && !collapsed ? (
                group.foldable ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setUnfolded((was) => ({ ...was, [group.key]: !open }))
                    }
                    className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-medium text-neutral-500 outline-hidden transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900"
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
                    {group.label}
                    {group.note ? (
                      <span className="font-normal">{group.note}</span>
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
                  </SidebarMenu>
                </>
              ) : (
                <p className="truncate px-2 pb-1 text-xs text-neutral-400">
                  {group.sections.map((section) => section.label).join(", ")}
                </p>
              )}
            </SidebarGroup>
          </Fragment>
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
  section: PanelSection;
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
          size={collapsed ? "default" : "lg"}
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
                    ? "border-neutral-300 text-white"
                    : undefined
                }
              />
            ) : (
              section.icon
            )}
            {collapsed ? null : (
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-medium">
                  {section.label}
                </span>
                <span
                  className={`truncate text-xs ${current ? "text-neutral-300" : "text-neutral-500"}`}
                >
                  {section.detail}
                </span>
              </span>
            )}
          </Link>
        </SidebarMenuButton>
        {hasItems ? (
          <SidebarMenuAction
            aria-expanded={open}
            aria-label={`${open ? "Close" : "Open"} ${section.label}`}
            onClick={() => onToggle(!open)}
            className={
              current
                ? "text-neutral-300 hover:bg-neutral-700 hover:text-white"
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
                    <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
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

/**
 * A tab at the panel's foot, the history: one line, its icon and its
 * name, marked while it is on screen; collapsed to a rail, the icon alone
 * with the section's line as its tooltip.
 */
export function PanelFootLink({
  slug,
  section,
}: {
  slug: string;
  section: PanelSection;
}) {
  const active = locationTabOf(slug, usePathname());
  return (
    <SidebarMenuButton
      asChild
      active={section.key === active}
      tooltip={`${section.label}: ${section.detail}`}
    >
      <Link href={section.href}>
        {section.icon}
        <SidebarLabel>{section.label}</SidebarLabel>
      </Link>
    </SidebarMenuButton>
  );
}
