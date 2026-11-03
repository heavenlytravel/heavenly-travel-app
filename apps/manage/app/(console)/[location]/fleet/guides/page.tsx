import Link from "next/link";
import { searchTermOf } from "@repo/db";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { PageHeader } from "@repo/console/PageHeader";
import { FleetList } from "../../../../_components/FleetList";
import { requireAdmin } from "../../../../_lib/access";
import { newGuideHref, SEARCH_PARAM } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";

/**
 * Route: /[location]/fleet/guides?q=…. Every vendor's tour guides:
 * every location's under `~`, with the location of each, or those based
 * at one location; active first, by name, with their languages. Figures
 * sum them up; the list narrows to a search by name, phone or language.
 * Their licence's expiry is kept on their form, not watched. A guide opens
 * here, and is added here. See docs/261103-tour-guide.md.
 */
export default async function GuidesPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/guides">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const query = await searchParams;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;

  return (
    <>
      <PageHeader
        title="Tour Guides"
        action={
          <Button asChild>
            <Link href={newGuideHref(scope.slug)}>
              <PlusIcon />
              Add tour guide
            </Link>
          </Button>
        }
      />
      <FleetList kind="guides" scope={scope} filter={{ q }} />
    </>
  );
}
