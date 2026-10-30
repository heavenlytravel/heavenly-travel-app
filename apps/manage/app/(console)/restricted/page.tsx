import Link from "next/link";
import { Button } from "@repo/ui/button";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { homeHref } from "../../_lib/console-map";
import { StopScreen } from "../../_components/StopScreen";

/**
 * Route: /restricted. Where `requireAdmin` sends an admin whose teams do
 * not reach a screen, with the way back to where it starts. /no-access
 * is for a person who is not staff at all.
 */
export default async function RestrictedPage() {
  await requireAdmin("locations.view");
  const home = homeHref({ scope: null, permissions: await getPermissions() });

  return (
    <StopScreen
      title="This Screen Belongs to Another Team"
      action={
        home ? (
          <Button asChild variant="secondary">
            <Link href={home}>Back to your start page</Link>
          </Button>
        ) : null
      }
    >
      Your teams do not reach it. A SUPER admin sets the teams of each admin,
      under Team.
    </StopScreen>
  );
}
