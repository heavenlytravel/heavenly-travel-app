"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarDock,
  SidebarHeader,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/sidebar";
import type { MouseEvent, ReactNode } from "react";
import { KEEPS_PANEL } from "./ConsoleMenu";
import { DockSearch } from "./ConsoleSearch";

/** A location as the picker lists it. */
export type SidebarLocation = {
  id: string;
  name: string;
  slug: string;
  state: string;
};

/**
 * The console's sidebar: the brand mark on top, then the menu of the
 * scope the picker in the header is on, from the layout's `@scope` slot.
 * On a location it holds that location alone; on All locations, the views
 * across locations and the console's own screens. Collapsed it is a rail
 * of icons with the labels as tooltips. Below `md` it is a panel over the
 * page, with no brand mark, opened from the dock floating at the screen's
 * foot, which holds the search too. A link in the panel closes it, except
 * a drill's row, which opens its menu there. See
 * docs/261023-console-sidebar.md.
 */
export function AppSidebar({
  scope,
}: {
  /** The scope's menu, from the `@scope` slot. */
  scope: ReactNode;
}) {
  const { setOpenMobile } = useSidebar();
  // A link pressed anywhere in the panel closes it; a drill's row and a
  // button do not. On a wide screen there is no panel to close.
  const closeOnLink = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as Element).closest("a");
    if (link && !link.matches(KEEPS_PANEL)) setOpenMobile(false);
  };

  const dock = (
    <SidebarDock>
      <DockSearch />
    </SidebarDock>
  );

  return (
    <>
      <Sidebar title="Console menu" dock={dock}>
        <SidebarHeader onClick={closeOnLink} className="max-md:hidden">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="Heavenly Travel Admin"
              >
                <Link href="/">
                  <Image
                    src="/brand/favicon.png"
                    alt=""
                    width={32}
                    height={32}
                    priority
                    className="size-8 shrink-0 rounded-lg"
                  />
                  <span className="grid flex-1 leading-tight">
                    <SidebarLabel className="text-sm font-semibold">
                      Heavenly Travel
                    </SidebarLabel>
                    <SidebarLabel className="text-xs text-slate-500">
                      Admin console
                    </SidebarLabel>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent onClick={closeOnLink}>{scope}</SidebarContent>
      </Sidebar>
      {dock}
    </>
  );
}
