"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { Permission } from "@repo/db";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import { Logo } from "@repo/ui/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
  useSidebarCollapsed,
} from "@repo/ui/sidebar";
import type { MouseEvent, ReactNode } from "react";
import { dashboardHref } from "../_lib/routes";
import { ConsoleDock } from "./ConsoleSearch";
import { ScopePicker, type PickerLocation } from "./ScopePicker";

/** The signed-in admin, at the sidebar's foot. */
export type Person = { name: string; role: string };

/**
 * The console's sidebar, navy to ink: the brand on top, then the one
 * menu, then the signed-in admin at its foot with their own menu (the
 * account, signing out). Collapsed it is a rail of icons with the names as
 * tooltips. Below `md` it is a panel over the page, opened from the dock
 * floating at the screen's foot, which holds the search too, with the
 * location picker on top in the brand's place. A link in the panel closes
 * it; opening a section does not. See
 * docs/261029-manage-signature-overhaul.md, "The menu".
 */
export function AppSidebar({
  menu,
  locations,
  permissions,
  person,
}: {
  /** The menu, drawn on the server with its counts streaming in. */
  menu: ReactNode;
  locations: readonly PickerLocation[];
  permissions: readonly Permission[];
  person: Person;
}) {
  const { setOpenMobile } = useSidebar();
  // A link pressed anywhere in the panel closes it; a button does not. On a
  // wide screen there is no panel to close.
  const closeOnLink = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as Element).closest("a")) setOpenMobile(false);
  };

  return (
    <>
      <Sidebar title="Console menu" tone="navy" dock={<ConsoleDock />}>
        <SidebarHeader className="border-b border-white/10 p-3 md:hidden">
          <ScopePicker
            locations={locations}
            permissions={permissions}
            full
          />
        </SidebarHeader>
        <Brand onLink={closeOnLink} />
        <SidebarContent onClick={closeOnLink} className="py-3">
          {menu}
        </SidebarContent>
        <PersonRow person={person} />
      </Sidebar>
      <ConsoleDock />
    </>
  );
}

/**
 * The brand at the sidebar's head, as high as the top bar beside it: the
 * logo in white with "Manage", and the button that folds the sidebar to a
 * rail. On the rail, the brand's mark alone, and the button under it.
 * The link goes to `/~` itself: `/` only sends on to it, and the page
 * between would show blank for a moment.
 */
function Brand({
  onLink,
}: {
  onLink: (event: MouseEvent<HTMLElement>) => void;
}) {
  const collapsed = useSidebarCollapsed();
  return (
    <SidebarHeader
      onClick={onLink}
      className={
        collapsed
          ? "items-center gap-2 border-b border-white/10 py-3 max-md:hidden"
          : "h-(--header-height) flex-row items-center gap-2.5 border-b border-white/10 px-5 max-md:hidden"
      }
    >
      <Link
        href={dashboardHref(null)}
        aria-label="Heavenly Travel Manage, the dashboard"
        className="flex min-w-0 items-center gap-2.5 rounded-md focus-ring focus-ring-dark"
      >
        {collapsed ? (
          <Image
            src="/brand/favicon.png"
            alt=""
            width={32}
            height={32}
            priority
            className="size-8 rounded-lg"
          />
        ) : (
          <>
            <Logo tone="white" alt="" loading="eager" className="h-6.5" />
            <span className="rounded-sm bg-white/12 px-1.5 py-0.5 text-caps font-semibold text-white">
              Manage
            </span>
          </>
        )}
      </Link>
      <SidebarTrigger
        aria-label={collapsed ? "Expand the menu" : "Fold the menu"}
        className={
          collapsed
            ? "size-9 text-azure-light hover:bg-white/14 hover:text-white"
            : "ml-auto text-azure-light hover:bg-white/14 hover:text-white"
        }
      />
    </SidebarHeader>
  );
}

/**
 * The signed-in admin at the sidebar's foot: their picture, which opens
 * their own menu, their name and their level. On the rail, the picture
 * alone.
 */
function PersonRow({ person }: { person: Person }) {
  const collapsed = useSidebarCollapsed();
  return (
    <div
      className={
        collapsed
          ? "flex justify-center border-t border-white/10 py-3"
          : "flex items-center gap-2.5 border-t border-white/10 px-4 py-3"
      }
    >
      {/* The box holds the button's place while Clerk loads, so the row does not shift. */}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-azure">
        <UserButton appearance={clerkUserButton} />
      </span>
      {collapsed ? null : (
        <span className="grid min-w-0 leading-tight">
          <span className="truncate text-caption font-semibold text-white">
            {person.name}
          </span>
          <span className="truncate text-xs text-azure-light">
            {person.role}
          </span>
        </span>
      )}
    </div>
  );
}
