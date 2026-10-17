"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/sidebar";
import { fullName, type Permission } from "@repo/db";
import {
  LOCATIONS_PATH,
  NEW_LOCATION_PATH,
  locationHref,
  locationIdOf,
} from "../_lib/routes";
import { LocationMark } from "./LocationMark";
import { LOCATIONS_NAV, isCurrentNav, navFor } from "./nav";

/** A location as the sidebar lists it. */
export type SidebarLocation = { id: string; name: string; state: string };

/**
 * The console's sidebar: the brand mark on top, the locations first, then
 * the sections the admin may open in groups, the signed-in admin at the
 * bottom. The locations are their own group, one name per row behind a
 * disc coloured by its state, with "All locations" (the home) at its head
 * and "Add location" at its foot for Marketing: an admin picks a location
 * first and works inside it, and the location's own sections are in the
 * panel on the page's right, not here. Collapsed it is a rail of icons
 * with the labels as tooltips; below `md` it opens as a sheet.
 */
export function AppSidebar({
  permissions,
  locations,
}: {
  permissions: readonly Permission[];
  locations: readonly SidebarLocation[];
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { user } = useUser();
  const name = user
    ? fullName({ firstName: user.firstName, lastName: user.lastName })
    : "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const close = () => setOpenMobile(false);

  const currentId = locationIdOf(pathname);
  const mayAdd = permissions.includes("locations.manage");

  return (
    <Sidebar title="Console menu">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Heavenly Travel Admin"
            >
              <Link href="/" onClick={close}>
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
                  <SidebarLabel className="text-xs text-neutral-500">
                    Admin console
                  </SidebarLabel>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {permissions.includes(LOCATIONS_NAV.permission) ? (
          <SidebarGroup>
            <SidebarGroupLabel>{LOCATIONS_NAV.label}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  active={pathname === LOCATIONS_PATH}
                  tooltip="All locations"
                >
                  <Link href={LOCATIONS_PATH} onClick={close}>
                    <LOCATIONS_NAV.icon />
                    <SidebarLabel>All locations</SidebarLabel>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {locations.map((location) => (
                <SidebarMenuItem key={location.id}>
                  <SidebarMenuButton
                    asChild
                    active={location.id === currentId}
                    tooltip={location.name}
                  >
                    <Link href={locationHref(location.id)} onClick={close}>
                      <LocationMark
                        name={location.name}
                        state={location.state}
                      />
                      <SidebarLabel>{location.name}</SidebarLabel>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {mayAdd ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    active={pathname === NEW_LOCATION_PATH}
                    tooltip="Add location"
                    className="text-neutral-500"
                  >
                    <Link href={NEW_LOCATION_PATH} onClick={close}>
                      <span
                        aria-hidden="true"
                        className="flex size-4 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-400 text-xs leading-none"
                      >
                        +
                      </span>
                      <SidebarLabel>Add location</SidebarLabel>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}

        {navFor(permissions).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    active={isCurrentNav(item, pathname)}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={close}>
                      <item.icon />
                      <SidebarLabel>{item.label}</SidebarLabel>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex h-12 items-center gap-2 overflow-hidden rounded-md p-2">
          <UserButton appearance={clerkUserButton} />
          <span className="grid min-w-0 flex-1 leading-tight">
            <SidebarLabel className="text-sm font-medium">
              {name || email}
            </SidebarLabel>
            {name ? (
              <SidebarLabel className="text-xs text-neutral-500">
                {email}
              </SidebarLabel>
            ) : null}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
