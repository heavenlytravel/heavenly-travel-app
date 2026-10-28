import Link from "next/link";
import { describeActivity, formatLocalDateTime } from "@repo/db";
import { getLocation, getPagePublish } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../../_components/Card";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import {
  BackLinkSkeleton,
  CardSkeleton,
  HeaderSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationPageHref, locationTabHref } from "../../../../../_lib/routes";
import { PageContentView } from "../../../../../_components/page-editor/PageContentView";
import { locationKey } from "../../../_lib/location-data";

/**
 * Route: /locations/[slug]/history/[entryId]. One publish from a location's
 * history: the page as it was before and as it was published, with the
 * parts that differ marked. There is no restore button: to roll back,
 * Marketing copies the old text into the editor and publishes again.
 */
export default async function LocationPublishPage({
  params,
}: PageProps<"/locations/[slug]/history/[entryId]">) {
  await requireAdmin("locations.manage");
  const { slug, entryId } = await params;
  const { id } = await locationKey(slug);

  return (
    <Streamed
      fallback={
        <>
          <BackLinkSkeleton />
          <HeaderSkeleton />
          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
            <CardSkeleton rows={7} />
            <CardSkeleton rows={7} />
          </div>
        </>
      }
    >
      {() => publishDetails({ id, entryId })}
    </Streamed>
  );
}

/** The publish under its sentence: the page before and after. */
async function publishDetails({
  id,
  entryId,
}: {
  id: string;
  entryId: string;
}) {
  const [location, publish] = await Promise.all([
    getLocation(id),
    getPagePublish(id, entryId),
  ]);
  if (!location || !publish) notFound();

  const { entry, ref, kind, before, after } = publish;
  const addressNames = new Map(
    location.addresses.map((address) => [address.id, address.name]),
  );

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationTabHref(location.slug, "history")}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          History
        </Link>
      </p>
      <SectionHeader
        title={describeActivity(entry)}
        description={`${entry.actorName}, ${formatLocalDateTime(entry.createdAt)}. To roll back, copy the old text into the editor and publish again.`}
        action={
          <Button asChild variant="secondary">
            <Link href={locationPageHref(location.slug, ref)}>
              Edit this page
            </Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardTitle>Before</CardTitle>
          {before ? (
            <PageContentView
              kind={kind}
              content={before}
              comparedTo={after}
              addressNames={addressNames}
            />
          ) : (
            <p className="text-sm text-slate-500">
              Nothing: this was the page&apos;s first publish.
            </p>
          )}
        </Card>
        <Card>
          <CardTitle>Published</CardTitle>
          <PageContentView
            kind={kind}
            content={after}
            comparedTo={before ?? undefined}
            addressNames={addressNames}
          />
        </Card>
      </div>
    </>
  );
}
