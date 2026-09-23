import type { ReactNode } from "react";
import { SiteShell } from "../_components/SiteShell";

/** The account pages: profile and My bookings. Each page checks access itself. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
