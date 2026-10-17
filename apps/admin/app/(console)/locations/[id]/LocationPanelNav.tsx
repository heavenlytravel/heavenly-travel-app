"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebarCollapsed,
  useSidebarPanel,
} from "@repo/ui/sidebar";
import { useEffect, useRef, type ReactNode } from "react";
import { locationTabOf, type LocationTab } from "../../../_lib/routes";
import { StepMark } from "../_components/StepMark";

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
};

/**
 * The sections of a location in the panel beside its page, each a row of
 * two lines: the tab's name and where it stands. The row of the path on
 * screen is marked; the editor of a page is on Pages, a publish in the
 * history on Overview. While the location is a draft, each setup step's
 * row carries its number, ticked once the step is done. On narrow screens
 * the panel is a sheet; a move to another path, from any link in it,
 * closes the sheet.
 */
export function LocationPanelNav({
  id,
  sections,
}: {
  id: string;
  sections: readonly PanelSection[];
}) {
  const pathname = usePathname();
  const active = locationTabOf(id, pathname);
  const { setOpen } = useSidebarPanel();
  // Collapsed to a rail, each row is its mark or icon alone, the label as its tooltip.
  const collapsed = useSidebarCollapsed();
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
        return (
          <SidebarMenuItem key={section.key}>
            <SidebarMenuButton
              asChild
              size={collapsed ? "default" : "lg"}
              active={current}
              tooltip={`${section.label}: ${section.detail}`}
            >
              <Link href={section.href}>
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
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
