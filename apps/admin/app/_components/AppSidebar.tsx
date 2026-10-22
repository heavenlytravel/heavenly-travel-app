"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/sidebar";
import type { Permission } from "@repo/db";
import type { MouseEvent, ReactNode } from "react";
import {
  ALL_LOCATIONS_NAV,
  groupFor,
  isCurrentNav,
  navFor,
  type NavGroup,
} from "./nav";

/** A location as the picker lists it. */
export type SidebarLocation = {
  id: string;
  name: string;
  slug: string;
  state: string;
};

/**
 * The console's sidebar: the brand mark on top, then the sections of the
 * scope the picker in the header is on, then the sections of the console
 * as a whole. The scope's sections come from the layout's `@scope` slot:
 * a location's own, its day's work first and its setup folded under it,
 * or the views across every location. Collapsed it is a rail of icons
 * with the labels as tooltips; below `md` it opens as a sheet, which any
 * link in it closes, one to the page on screen or a part of it included.
 * See docs/261022-console-scope.md.
 */
export function AppSidebar({
  permissions,
  scope,
}: {
  permissions: readonly Permission[];
  /** The scope's sections, from the `@scope` slot. */
  scope: ReactNode;
}) {
  const { setOpenMobile } = useSidebar();
  // A link pressed anywhere in the sheet closes it; a submenu's chevron,
  // a button, does not. On a wide screen there is no sheet to close.
  const closeOnLink = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as Element).closest("a")) setOpenMobile(false);
  };

  return (
    <Sidebar title="Console menu">
      <SidebarHeader onClick={closeOnLink}>
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

      <SidebarContent onClick={closeOnLink}>
        {scope}
        {navFor(permissions).map((group) => (
          <NavGroupMenu key={group.label} group={group} />
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

/** A group of sections under its heading, the one on screen marked. */
function NavGroupMenu({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              active={isCurrentNav(item, pathname)}
              tooltip={item.label}
            >
              <Link href={item.href}>
                <item.icon />
                <SidebarLabel>{item.label}</SidebarLabel>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/** The sidebar on All locations: the home and the views across locations the admin may open. */
export function AllLocationsMenu({
  permissions,
}: {
  permissions: readonly Permission[];
}) {
  const group = groupFor(ALL_LOCATIONS_NAV, permissions);
  return group ? <NavGroupMenu group={group} /> : null;
}
