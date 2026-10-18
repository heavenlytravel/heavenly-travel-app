"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { locationSlugOf } from "../_lib/routes";
import { PageColumn } from "./PageColumn";

/**
 * What sits under the console header. Off a location it is the page in
 * its column. Inside a location the location's layout lays its own column
 * out, with its panel beside it, so here the two are only put in a row:
 * the panel sticks within the row's height, which is the column's.
 */
export function ConsoleBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (locationSlugOf(pathname) !== null) {
    return <div className="flex flex-1 items-start">{children}</div>;
  }
  return <PageColumn>{children}</PageColumn>;
}
