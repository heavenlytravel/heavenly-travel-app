import { SidebarInset, SidebarProvider } from "@repo/ui/sidebar";
import { Toaster } from "@repo/ui/toast";
import { cookies } from "next/headers";
import { AppSidebar } from "../_components/AppSidebar";
import { ConsoleHeader } from "../_components/ConsoleHeader";
import { ConsoleScopeProvider } from "../_components/ConsoleScope";
import { PageColumn } from "../_components/PageColumn";
import { getPermissions } from "../_lib/access";
import { locationNames } from "../_lib/location-names";
import { SCOPE_COOKIE, scopeKey, scopeOfKey } from "../_lib/routes";

// Chrome only. Access is checked by each page with `requireAdmin`, which
// redirects before anything here reaches the browser. The permissions read
// here only choose which links the sidebar and the header show, and the
// locations are the picker's list of them: every admin may open every
// location. `scope` is the `@scope` slot: the sidebar's sections of the
// location or of every location, by the page on screen. See
// docs/261022-console-scope.md.
export default async function ConsoleLayout({
  children,
  scope,
}: LayoutProps<"/">) {
  // The sidebar remembers whether it was collapsed, and the console the
  // scope last worked in, read here so the first paint already matches.
  const [store, permissions, locations] = await Promise.all([
    cookies(),
    getPermissions(),
    locationNames(),
  ]);
  const defaultOpen = store.get("sidebar_state")?.value !== "false";
  const remembered = scopeOfKey(store.get(SCOPE_COOKIE)?.value);
  // A location since deleted leaves every location in its place.
  const known =
    remembered === "all" ||
    locations.some((location) => location.slug === remembered.slug);

  return (
    <ConsoleScopeProvider remembered={known ? scopeKey(remembered) : "all"}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar permissions={permissions} scope={scope} />
        <SidebarInset>
          <ConsoleHeader locations={locations} permissions={permissions} />
          <PageColumn>{children}</PageColumn>
        </SidebarInset>
        {/* The console's one place for "Saved" and the like, at the corner. */}
        <Toaster />
      </SidebarProvider>
    </ConsoleScopeProvider>
  );
}
