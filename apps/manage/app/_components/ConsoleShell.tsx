import { PageColumn } from "@repo/console/PageColumn";
import { Streamed } from "@repo/console/Skeleton";
import { SidebarInset, SidebarProvider } from "@repo/ui/sidebar";
import { Toaster } from "@repo/ui/toast";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { getPermissions, getPerson } from "../_lib/access";
import { consoleMenu } from "../_lib/console-menu";
import { locationsVisible, type ConsoleScope } from "../_lib/scope";
import { AppSidebar } from "./AppSidebar";
import { ConsoleMenu } from "./ConsoleMenu";
import { ConsoleSearch } from "./ConsoleSearch";
import { ConsoleTopBar } from "./ConsoleTopBar";
import { PageTrail } from "./PageTrail";

/**
 * The console's chrome round a page: the navy sidebar with the one menu,
 * the top bar with the sidebar's fold button, the location picker, the
 * search and the signed-in admin, the page's column on the mist canvas,
 * and the toasts. Chrome only: access is checked by
 * each page with `requireAdmin`, which redirects before anything here
 * reaches the browser. The permissions read here only choose which rows
 * the menu shows. Someone who is not an admin gets the page alone, which
 * sends them on, so not even the names of the locations. The menu draws at
 * once and its counts stream in. See
 * docs/261029-manage-signature-overhaul.md.
 */
export async function ConsoleShell({
  scope,
  children,
}: {
  scope: ConsoleScope;
  children: ReactNode;
}) {
  // The sidebar remembers whether it was folded, read here so the first
  // paint already matches.
  const [store, permissions, locations, person] = await Promise.all([
    cookies(),
    getPermissions(),
    locationsVisible(),
    getPerson(),
  ]);
  if (permissions.length === 0 || !person) return children;
  const defaultOpen = store.get("sidebar_state")?.value !== "false";
  const plain = await consoleMenu(scope, permissions, false);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ConsoleSearch locations={locations} permissions={permissions}>
        <AppSidebar
          menu={
            <Streamed fallback={<ConsoleMenu menu={plain} />} bare>
              {async () => (
                <ConsoleMenu
                  menu={await consoleMenu(scope, permissions, true)}
                />
              )}
            </Streamed>
          }
          locations={locations}
          permissions={permissions}
        />
        <SidebarInset>
          <ConsoleTopBar
            locations={locations}
            permissions={permissions}
            person={person}
          />
          <PageColumn>
            <PageTrail />
            {children}
          </PageColumn>
        </SidebarInset>
      </ConsoleSearch>
      {/* The console's one place for "Saved" and the like, at the corner. */}
      <Toaster />
    </SidebarProvider>
  );
}
