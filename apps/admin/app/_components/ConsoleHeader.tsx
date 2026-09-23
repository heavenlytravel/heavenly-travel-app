"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@repo/ui/sidebar";
import { currentNav } from "./nav";

/** The bar above every console page: the sidebar toggle and where you are. */
export function ConsoleHeader() {
  const pathname = usePathname();
  const section = currentNav(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-neutral-200" />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <span className="hidden text-neutral-500 md:inline">Admin</span>
        <span aria-hidden="true" className="hidden text-neutral-300 md:inline">
          /
        </span>
        <span className="font-medium text-neutral-900">
          {section?.label ?? "Console"}
        </span>
      </nav>
    </header>
  );
}
