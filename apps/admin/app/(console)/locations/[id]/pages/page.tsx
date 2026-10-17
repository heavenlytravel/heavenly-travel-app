import Link from "next/link";
import { LOCATION_PAGE_LABELS, locationPagePath } from "@repo/db";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { PageStatusBadge } from "../../../../_components/StatusBadges";
import { requireAdmin } from "../../../../_lib/access";
import { locationPageHref } from "../../../../_lib/routes";
import { locationDetails } from "../../_lib/location-data";

/**
 * Route: /locations/[id]/pages. Marketing's tab: the location's pages, each
 * with its standing and its editor. A page is published and unpublished in
 * its editor.
 */
export default async function LocationPagesPage({
  params,
}: PageProps<"/locations/[id]/pages">) {
  await requireAdmin("locations.manage");
  const { id } = await params;

  return (
    <Streamed fallback={<CardSkeleton rows={3} />}>
      {() => pages({ id })}
    </Streamed>
  );
}

async function pages({ id }: { id: string }) {
  const location = await locationDetails(id);
  if (!location) notFound();

  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-1.5">
          Pages
          <InfoTip text="A published page is one the public can see, once the location is live. “Published, edits waiting” means the public still sees the copy last published, and the draft holds newer edits. Only the landing page is needed to go live: a product page is an extra page about one product, and the search card offers every product either way. Publish and unpublish a page in its editor." />
        </span>
      </CardTitle>
      <ul className="divide-y divide-neutral-100">
        {location.pages.map((page) => (
          <li
            key={page.page}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
          >
            <div className="min-w-40 flex-1">
              <span className="block text-sm font-medium">
                {LOCATION_PAGE_LABELS[page.page]}
              </span>
              <span className="block text-xs text-neutral-500">
                {locationPagePath(location.slug, page.page)}
              </span>
              <span className="mt-1 block">
                <PageStatusBadge status={page.status} />
              </span>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href={locationPageHref(location.id, page.page)}>Edit</Link>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
