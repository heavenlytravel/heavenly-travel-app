import { redirect } from "next/navigation";
import { dashboardHref } from "./_lib/routes";

/** Route: /. The console opens on the dashboard of every location. */
export default function RootPage() {
  redirect(dashboardHref(null));
}
