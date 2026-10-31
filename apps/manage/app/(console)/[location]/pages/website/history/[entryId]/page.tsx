import Link from "next/link";
import {
  describeActivity,
  footerEditorPath,
  formatLocalDateTime,
} from "@repo/db";
import {
  SITE_URL,
  getFooterPublish,
  getSitePagePublish,
  type ActivityEntry,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { PageContentView } from "../../../../../../_components/page-editor/PageContentView";
import { requireAdmin } from "../../../../../../_lib/access";
import { sitePageHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";
import { FooterContentView } from "../../../_components/footer/FooterContentView";

/** A site page names no saved address. */
const NO_ADDRESSES: ReadonlyMap<string, string> = new Map();

/**
 * Route: /~/pages/website/history/[entryId]. One publish of a site page
 * or of the footer: as it was before and as it was published, with the
 * parts that differ marked. There is no restore button: to roll back,
 * Marketing copies the old text into the editor and publishes again.
 * Console-wide: under a slug it is not found. Marketing's and
 * SEO's (`website.manage`).
 */
export default async function SitePagePublishPage({
  params,
}: PageProps<"/[location]/pages/website/history/[entryId]">) {
  await requireAdmin("website.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const { entryId } = await params;

  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
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
  // Most entries are a site page's; the footer's is read only when it is not.
  const publish = await getSitePagePublish(entryId);
  const footer = publish ? null : await getFooterPublish(entryId);
  if (footer) {
    return (
      <PublishHeader
        entry={footer.entry}
        edit={{ href: footerEditorPath(footer.key), label: "Edit the footer" }}
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
            <p className="text-sm text-muted">
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
          <p className="text-sm text-muted">
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

/** A publish's sentence as its title, who and when, the way to its editor, then `children` side by side. */
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
      <PageHeader
        title={describeActivity(entry)}
        badge={
          <InfoTip text="To roll back, copy the old text into the editor and publish again." />
        }
        meta={`${entry.actorName}, ${formatLocalDateTime(entry.createdAt)}`}
        action={
          <Button asChild variant="secondary">
            <Link href={edit.href}>{edit.label}</Link>
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">{children}</div>
    </>
  );
}
