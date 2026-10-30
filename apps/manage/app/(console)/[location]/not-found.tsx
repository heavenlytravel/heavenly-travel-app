import Link from "next/link";
import { Button } from "@repo/ui/button";
import { StopScreen } from "../../_components/StopScreen";
import { dashboardHref } from "../../_lib/routes";

/**
 * A record or a screen not found inside the console, as `notFound()` says
 * it: in the console's chrome, the sidebar kept, with the way to the
 * dashboard. The page's column is the shell's.
 */
export default function ConsoleNotFound() {
  return (
    <StopScreen
      title="Page Not Found"
      action={
        <Button asChild variant="secondary">
          <Link href={dashboardHref(null)}>Go to the dashboard</Link>
        </Button>
      }
    >
      This address doesn&apos;t lead to a screen in the console.
    </StopScreen>
  );
}
