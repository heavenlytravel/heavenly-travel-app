import { SidebarInset, SidebarProvider } from "@repo/ui/sidebar";
import { cookies } from "next/headers";
import { AppSidebar } from "../_components/AppSidebar";
import { ConsoleHeader } from "../_components/ConsoleHeader";

// Chrome only. Access is checked by each page with `requireAdmin`, which
// redirects before anything here reaches the browser.
export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The sidebar remembers whether it was collapsed, read here so the first
  // paint already matches.
  const store = await cookies();
  const defaultOpen = store.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <ConsoleHeader />
        <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 md:px-10 md:pt-10">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
