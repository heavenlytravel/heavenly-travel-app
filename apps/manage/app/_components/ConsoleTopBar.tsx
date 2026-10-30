"use client";

import { UserButton } from "@clerk/nextjs";
import type { Permission } from "@repo/db";
import { clerkUserButton } from "@repo/ui/clerk-appearance";
import { NavigationProgress } from "@repo/ui/navigation-progress";
import { SidebarTrigger } from "@repo/ui/sidebar";
import { Tooltip } from "@repo/ui/tooltip";
import { SearchBox } from "./ConsoleSearch";
import { ScopePicker, type PickerLocation } from "./ScopePicker";

/** The signed-in admin, at the top bar's end. */
export type Person = { name: string; role: string };

/**
 * The bar above every console page. On the left, from `md` up, the button
 * that folds the sidebar, which stays there either way, then the location
 * picker. On the right, from `md` up, the search, which opens the command
 * palette (Ctrl or Cmd + K), then the signed-in admin's picture, which
 * opens their own menu (the account, signing out) and names them and
 * their level on hover. Nothing else: the page's own title says where it
 * is. On a phone it is a white bar with the picker and the picture; the
 * menu and the search are in the dock.
 */
export function ConsoleTopBar({
  locations,
  permissions,
  person,
}: {
  locations: readonly PickerLocation[];
  permissions: readonly Permission[];
  person: Person;
}) {
  return (
    <header className="sticky top-0 z-(--layer-sticky) flex h-(--header-height) shrink-0 items-center gap-3 border-b border-edge bg-white px-4 md:bg-canvas/90 md:px-7 md:backdrop-blur">
      <NavigationProgress
        className="absolute inset-x-0 top-0"
        gradient={["var(--navy)", "var(--azure)"]}
      />
      <SidebarTrigger className="-ml-2 max-md:hidden" />
      <ScopePicker locations={locations} permissions={permissions} />
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
        <SearchBox />
        <Tooltip
          side="bottom"
          content={
            <span className="grid">
              <span className="font-semibold">{person.name}</span>
              <span className="text-white/75">{person.role}</span>
            </span>
          }
          className="shrink-0"
        >
          {/* The box holds the button's place while Clerk loads, so the bar does not shift. */}
          <span className="flex size-8 items-center justify-center rounded-full bg-azure">
            <UserButton appearance={clerkUserButton} />
          </span>
        </Tooltip>
      </div>
    </header>
  );
}
