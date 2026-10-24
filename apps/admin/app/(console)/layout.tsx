import { SidebarInset, SidebarProvider } from "@repo/ui/sidebar";
import { Toaster } from "@repo/ui/toast";
import { cookies } from "next/headers";
import { AppSidebar } from "../_components/AppSidebar";
import { ConsoleHeader } from "../_components/ConsoleHeader";
import { ConsoleSearch } from "../_components/ConsoleSearch";
import { PageColumn } from "../_components/PageColumn";
import { getPermissions } from "../_lib/access";
import { locationNames } from "../_lib/location-names";

// Chrome only. Access is checked by each page with `requireAdmin`, which
// redirects before anything here reaches the browser. The permissions read
// here only choose which links the sidebar and the header show, and the
// locations are the picker's list of them: every admin may open every
// location. `scope` is the `@scope` slot: the sidebar's menu of the
// location on screen, or of every location. Someone who is not an admin
// reaches no page here, only a page not found, which gets no chrome, so
// not even the names of the locations. See docs/261023-console-sidebar.md.
export default async function ConsoleLayout({
  children,
  scope,
}: LayoutProps<"/">) {
  // The sidebar remembers whether it was collapsed, read here so the first
  // paint already matches.
  const [store, permissions, locations] = await Promise.all([
    cookies(),
    getPermissions(),
    locationNames(),
  ]);
  if (permissions.length === 0) return children;
  const defaultOpen = store.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ConsoleSearch locations={locations} permissions={permissions}>
        <AppSidebar
          scope={scope}
          locations={locations}
          permissions={permissions}
        />
        <SidebarInset>
          <ConsoleHeader locations={locations} permissions={permissions} />
          <PageColumn>{children}</PageColumn>
        </SidebarInset>
      </ConsoleSearch>
      {/* The console's one place for "Saved" and the like, at the corner. */}
      <Toaster />
    </SidebarProvider>
  );
}
