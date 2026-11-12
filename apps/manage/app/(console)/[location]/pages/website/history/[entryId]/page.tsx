import { CONNECT_FOOTER_KEY, footerEditorPath } from "@repo/db";
import {
  SITE_URL,
  getFooterPublish,
  getSitePagePublish,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import {
  PagePublishCards,
  PublishHeader,
} from "../../../../../../_components/page-editor/PublishView";
import { requireAdmin } from "../../../../../../_lib/access";
import { sitePageHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";
import { FooterContentView } from "../../../_components/footer/FooterContentView";

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
              {footer.key === CONNECT_FOOTER_KEY
                ? "Connect showed the website's footer: this was its first publish."
                : "The footer the site started with: this was its first publish."}
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
      <PagePublishCards kind={kind} before={before} after={after} />
    </PublishHeader>
  );
}
