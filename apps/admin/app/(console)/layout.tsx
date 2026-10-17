import { listLocationNames } from "@repo/db/server";
import {
  SidebarInset,
  SidebarPanelProvider,
  SidebarProvider,
} from "@repo/ui/sidebar";
import { cookies } from "next/headers";
import { AppSidebar } from "../_components/AppSidebar";
import { ConsoleBody } from "../_components/ConsoleBody";
import { ConsoleHeader } from "../_components/ConsoleHeader";
import { getPermissions } from "../_lib/access";

// Chrome only. Access is checked by each page with `requireAdmin`, which
// redirects before anything here reaches the browser. The permissions read
// here only choose which links the sidebar shows, and the locations are
// its list of them: every admin may open every location.
export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The sidebar remembers whether it was collapsed, read here so the first
  // paint already matches.
  const [store, permissions, locations] = await Promise.all([
    cookies(),
    getPermissions(),
    listLocationNames(),
  ]);
  const defaultOpen = store.get("sidebar_state")?.value !== "false";
  // The location panel remembers its own collapse, apart from the sidebar's.
  const panelCollapsed = store.get("panel_state")?.value === "collapsed";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar permissions={permissions} locations={locations} />
      <SidebarInset>
        {/* The location panel's sheet state: its trigger is in the header, the panel in the page. */}
        <SidebarPanelProvider defaultCollapsed={panelCollapsed}>
          <ConsoleHeader locations={locations} />
          <ConsoleBody>{children}</ConsoleBody>
        </SidebarPanelProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
