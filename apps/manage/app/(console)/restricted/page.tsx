import Link from "next/link";
import { Button } from "@repo/ui/button";
import { requireAdmin } from "../../_lib/access";
import { dashboardHref } from "../../_lib/routes";
import { StopScreen } from "../../_components/StopScreen";

/**
 * Route: /restricted. Where `requireAdmin` sends an admin whose teams do
 * not reach a screen. /no-access is for a person who is not staff at all.
 */
export default async function RestrictedPage() {
  await requireAdmin("dashboard.view");

  return (
    <StopScreen
      title="This screen belongs to another team"
      action={
        <Button asChild variant="secondary">
          <Link href={dashboardHref(null)}>Back to the dashboard</Link>
        </Button>
      }
    >
      Your teams do not reach it. A SUPER admin sets the teams of each admin,
      under Team.
    </StopScreen>
  );
}
