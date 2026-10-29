"use client";

import type { Permission } from "@repo/db";
import { NavigationProgress } from "@repo/ui/navigation-progress";
import { SearchBox } from "./ConsoleSearch";
import { ScopePicker, type PickerLocation } from "./ScopePicker";

/**
 * The bar above every console page: the location picker on the left and,
 * from `md` up, the search on the right, which opens the command palette
 * (Ctrl or Cmd + K). Nothing else: the page's own title says where it is,
 * and the signed-in admin is at the sidebar's foot. On a phone it is a
 * white bar with the picker alone; the search is in the dock.
 */
export function ConsoleTopBar({
  locations,
  permissions,
}: {
  locations: readonly PickerLocation[];
  permissions: readonly Permission[];
}) {
  return (
    <header className="sticky top-0 z-(--layer-sticky) flex h-(--header-height) shrink-0 items-center gap-3 border-b border-edge bg-white px-4 md:bg-canvas/90 md:px-7 md:backdrop-blur">
      <NavigationProgress
        className="absolute inset-x-0 top-0"
        gradient={["var(--navy)", "var(--azure)"]}
      />
      <ScopePicker locations={locations} permissions={permissions} />
      <div className="ml-auto flex min-w-0 flex-1 justify-end">
        <SearchBox />
      </div>
    </header>
  );
}
