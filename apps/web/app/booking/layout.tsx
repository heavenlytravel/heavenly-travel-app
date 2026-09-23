import type { ReactNode } from "react";
import { SiteShell } from "../_components/SiteShell";

/** The booking pages: options, confirm and the success page. */
export default function BookingLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
