"use client";

import { useSidebarCollapsed } from "@repo/ui/sidebar";
import type { ReactNode } from "react";

/**
 * What the sidebar shows only while it is open, not collapsed to a rail:
 * a server component wraps it in this and the rail is decided in the
 * browser, where the state lives. Inside the mobile sheet everything
 * counts as open.
 */
export function WhenExpanded({ children }: { children: ReactNode }) {
  return useSidebarCollapsed() ? null : children;
}
