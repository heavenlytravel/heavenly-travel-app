import Link from "next/link";
import { FOOTER_KEY, describeActivity, formatLocalDateTime } from "@repo/db";
import {
  SITE_URL,
  getFooterPublish,
  getSitePagePublish,
  type ActivityEntry,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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
import { FooterContentView } from "../../footer/FooterContentView";

/** A site page names no saved address. */
const NO_ADDRESSES: ReadonlyMap<string, string> = new Map();

/**
 * Route: /pages/website/history/[entryId]. One publish of a site page or
 * of the footer: as it was before and as it was published, with the parts
 * that differ marked. There is no restore button: to roll back, Marketing
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

/** The publish under its sentence: the page or the footer before and after. */
async function publishDetails({ entryId }: { entryId: string }) {
  const [publish, footer] = await Promise.all([
    getSitePagePublish(entryId),
    getFooterPublish(entryId),
  ]);
  if (footer) {
    return (
      <PublishHeader
        entry={footer.entry}
        edit={{ href: sitePageHref(FOOTER_KEY), label: "Edit the footer" }}
      >
        <Card>
          <CardTitle>Before</CardTitle>
          {footer.before ? (
            <FooterContentView
              content={footer.before}
              comparedTo={footer.after}
              siteUrl={SITE_URL}
            />
          ) : (
            <p className="text-sm text-slate-500">
              The footer the site started with: this was its first publish.
            </p>
          )}
        </Card>
        <Card>
          <CardTitle>Published</CardTitle>
          <FooterContentView
            content={footer.after}
            comparedTo={footer.before ?? undefined}
            siteUrl={SITE_URL}
          />
        </Card>
      </PublishHeader>
    );
  }
  if (!publish) notFound();
  const { entry, page, kind, before, after } = publish;

  return (
    <PublishHeader
      entry={entry}
      edit={{ href: sitePageHref(page), label: "Edit this page" }}
    >
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
    </PublishHeader>
  );
}

/** A publish's sentence, who and when, the way back to its editor, then `children` side by side. */
function PublishHeader({
  entry,
  edit,
  children,
}: {
  entry: ActivityEntry;
  edit: { href: string; label: string };
  children: ReactNode;
}) {
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
            <Link href={edit.href}>{edit.label}</Link>
          </Button>
        }
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        {children}
      </div>
    </>
  );
}
