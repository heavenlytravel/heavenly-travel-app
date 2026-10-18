"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebarCollapsed,
  useSidebarPanel,
} from "@repo/ui/sidebar";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { locationTabOf, type LocationTab } from "../../../_lib/routes";
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

const DOTS = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  grey: "bg-neutral-300",
} as const;

/**
 * The sections of a location in the panel beside its page, each a row of
 * two lines: the tab's name and where it stands. A section with something
 * to list (its zones, its classes, its pages, its bookings by status) has
 * a chevron that opens it as a submenu; the section on screen opens by
 * itself, and a toggled one stays as it was left while the admin moves
 * around the location. The row of the path on screen is marked; the
 * editor of a page is on Pages, a publish on History. While the location
 * is a draft, each setup step's row carries its number, ticked once the
 * step is done. On narrow screens the panel is a sheet; a move to another
 * path, from any link in it, closes the sheet.
 */
export function LocationPanelNav({
  slug,
  sections,
}: {
  /** The location's slug, its address. */
  slug: string;
  sections: readonly PanelSection[];
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  const active = locationTabOf(slug, pathname);
  const { setOpen } = useSidebarPanel();
  // Collapsed to a rail, each row is its mark or icon alone, the label as its tooltip.
  const collapsed = useSidebarCollapsed();
  // The submenus the admin opened or closed by hand; the rest follow the tab on screen.
  const [toggled, setToggled] = useState<Partial<Record<LocationTab, boolean>>>(
    {},
  );
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <SidebarMenu aria-label="Location sections">
      {sections.map((section) => {
        const current = section.key === active;
        const hasItems = section.items.length > 0 && !collapsed;
        const open = hasItems && (toggled[section.key] ?? current);
        return (
          <SidebarMenuItem key={section.key}>
            {/* The row and its chevron, so the chevron centres on the row and not on the open submenu. */}
            <div className="relative">
              <SidebarMenuButton
                asChild
                size={collapsed ? "default" : "lg"}
                active={current}
                tooltip={`${section.label}: ${section.detail}`}
              >
                <Link
                  href={section.href}
                  className={hasItems ? "pr-9" : undefined}
                >
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
                  onClick={() =>
                    setToggled((was) => ({ ...was, [section.key]: !open }))
                  }
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
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
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
      })}
    </SidebarMenu>
  );
}
