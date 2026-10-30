"use client";

import { usePathname } from "next/navigation";
import { Trail } from "@repo/console/PageHeader";
import { trailOf } from "../_lib/console-map";

/**
 * The trail over every console page's title, read off the address: drawn
 * by the chrome at once, before the page has loaded, so no page draws its
 * own way back. None on the dashboard, which opens on its band.
 */
export function PageTrail() {
  const crumbs = trailOf(usePathname());
  return crumbs.length > 0 ? <Trail crumbs={crumbs} /> : null;
}
