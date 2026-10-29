import Link from "next/link";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { requireAdmin } from "../../_lib/access";
import { dashboardHref } from "../../_lib/routes";

/**
 * Route: /restricted. Where `requireAdmin` sends an admin whose teams do
 * not reach a screen. /no-access is for a person who is not staff at all.
 */
export default async function RestrictedPage() {
  await requireAdmin("dashboard.view");

  return (
    <>
      <PageHeader title="This screen belongs to another team" />
      <Card className="max-w-xl">
        <p className="text-sm text-body">
          Your teams do not reach it. A SUPER admin sets the teams of each
          admin, under Team.
        </p>
        <Link
          href={dashboardHref(null)}
          className="mt-4 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          Back to the dashboard
        </Link>
      </Card>
    </>
  );
}
