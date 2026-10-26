import Link from "next/link";
import { describeActivity, formatLocalDateTime } from "@repo/db";
import { getSitePagePublish } from "@repo/db/server";
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
import { PageContentView } from "../../../../../_components/page-editor/PageContentView";
import { requireAdmin } from "../../../../../_lib/access";
import { activityHref, sitePageHref } from "../../../../../_lib/routes";

/** A site page names no saved address. */
const NO_ADDRESSES: ReadonlyMap<string, string> = new Map();

/**
 * Route: /pages/website/history/[entryId]. One publish of a site page: the
 * page as it was before and as it was published, with the parts that
 * differ marked. There is no restore button: to roll back, Marketing
 * copies the old text into the editor and publishes again.
 */
export default async function SitePagePublishPage({
  params,
}: PageProps<"/pages/website/history/[entryId]">) {
  await requireAdmin("website.manage");
  const { entryId } = await params;

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
      {() => publishDetails({ entryId })}
    </Streamed>
  );
}

/** The publish under its sentence: the page before and after. */
async function publishDetails({ entryId }: { entryId: string }) {
  const publish = await getSitePagePublish(entryId);
  if (!publish) notFound();
  const { entry, page, kind, before, after } = publish;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={activityHref("site-page")}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          Changes to the site&apos;s pages
        </Link>
      </p>
      <SectionHeader
        title={describeActivity(entry)}
        description={`${entry.actorName}, ${formatLocalDateTime(entry.createdAt)}. To roll back, copy the old text into the editor and publish again.`}
        action={
          <Button asChild variant="secondary">
            <Link href={sitePageHref(page)}>Edit this page</Link>
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
              addressNames={NO_ADDRESSES}
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
            addressNames={NO_ADDRESSES}
          />
        </Card>
      </div>
    </>
  );
}
