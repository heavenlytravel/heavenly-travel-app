import Link from "next/link";
import { PageHeader } from "../../_components/PageHeader";
import { requireAdmin } from "../../_lib/access";

/**
 * Route: /restricted. Where `requireAdmin` sends an admin whose teams do
 * not reach a screen. /no-access is for a person who is not staff at all.
 */
export default async function RestrictedPage() {
  await requireAdmin("dashboard.view");

  return (
    <>
      <PageHeader
        title="This screen belongs to another team"
        description="Your teams do not reach it. A SUPER admin sets the teams of each admin."
      />
      <p className="mt-6 text-sm">
        <Link
          href="/"
          className="font-medium text-neutral-600 underline-offset-4 hover:underline"
        >
          Back to the Dashboard
        </Link>
      </p>
    </>
  );
}
