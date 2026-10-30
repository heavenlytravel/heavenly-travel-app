"use client";

import Image from "next/image";
import Link from "next/link";
import type { Permission } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { Logo } from "@repo/ui/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
  useSidebarCollapsed,
} from "@repo/ui/sidebar";
import type { MouseEvent, ReactNode } from "react";
import { dashboardHref } from "../_lib/routes";
import { ConsoleDock } from "./ConsoleSearch";
import { ScopePicker, type PickerLocation } from "./ScopePicker";

/**
 * The console's sidebar, navy to ink: the brand on top, then the one
 * menu. Collapsed it is a rail of icons with the names as tooltips; the
 * button that folds it is in the top bar, where it stays either way. Below
 * `md` it is a panel over the page, opened from the dock floating at the
 * screen's foot, which holds the search too, with the location picker on
 * top in the brand's place. A link in the panel closes it; opening a
 * section does not. See docs/261029-manage-signature-overhaul.md, "The
 * menu".
 */
export function AppSidebar({
  menu,
  locations,
  permissions,
}: {
  /** The menu, drawn on the server with its counts streaming in. */
  menu: ReactNode;
  locations: readonly PickerLocation[];
  permissions: readonly Permission[];
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
          <ScopePicker locations={locations} permissions={permissions} full />
        </SidebarHeader>
        <Brand onLink={closeOnLink} />
        <SidebarContent onClick={closeOnLink} className="py-3">
          {menu}
        </SidebarContent>
      </Sidebar>
      <ConsoleDock />
    </>
  );
}

/**
 * The brand at the sidebar's head, as high as the top bar beside it: the
 * logo in white, a link to the dashboard of every location. On the rail,
 * the brand's mark alone. The link goes to `/~` itself: `/` only sends
 * on to it, and the page between would show blank for a moment.
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
      className={cx(
        "h-(--header-height) flex-row items-center border-b border-white/10 max-md:hidden",
        collapsed ? "justify-center" : "px-5",
      )}
    >
      <Link
        href={dashboardHref(null)}
        aria-label="Heavenly Travel, the dashboard"
        className="flex min-w-0 items-center rounded-md focus-ring focus-ring-dark"
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
          <Logo tone="white" alt="" loading="eager" className="h-6.5" />
        )}
      </Link>
    </SidebarHeader>
  );
}
