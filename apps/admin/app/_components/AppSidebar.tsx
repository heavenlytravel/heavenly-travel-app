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
import { fullName } from "@repo/db";
import { isCurrentNav, NAV } from "./nav";

/**
 * The console's sidebar: the brand mark on top, the sections in groups,
 * the signed-in admin at the bottom. Collapsed it is a rail of icons with
 * the labels as tooltips; below `md` it opens as a sheet.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { user } = useUser();
  const name = user
    ? fullName({ firstName: user.firstName, lastName: user.lastName })
    : "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

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
              <Link href="/" onClick={() => setOpenMobile(false)}>
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
        {NAV.map((group) => (
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
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
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
