import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { dashboardHref } from "../../_lib/routes";

/**
 * A record or a screen not found inside the console, as `notFound()` says
 * it: in the console's chrome, the sidebar kept, with the way to the
 * dashboard. The page's column is the shell's.
 */
export default function ConsoleNotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Card className="max-w-xl">
        <p className="text-sm text-body">
          This address doesn&apos;t lead to a screen in the console.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href={dashboardHref(null)}>Go to the dashboard</Link>
        </Button>
      </Card>
    </>
  );
}
