import {
  FOOTER_KEY_OF,
  isPageInList,
  sitePageAppOf,
  type PageFilter,
  type SitePageApp,
} from "@repo/db";
import { getFooterSummary, listSitePageSummaries } from "@repo/db/server";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import { sitePagesHref } from "../../../../_lib/routes";
import { PageTree, footerRow, sitePageRow, type PageGroup } from "./PageList";
import { PageStatusStrip, countedOfRow, emptyOf } from "./PageStatusStrip";

const TITLES: Record<SitePageApp, string> = {
  website: "Website",
  connect: "Connect",
};

/**
 * The screen of an app's pages under Pages, its title the app's name, as
 * the menu names it. The route checks the access and the scope first.
 */
export function SitePagesScreen(props: {
  app: SitePageApp;
  status: PageFilter | undefined;
  q: string | undefined;
}) {
  return (
    <>
      <PageHeader title={TITLES[props.app]} />
      <Streamed
        key={JSON.stringify(props)}
        fallback={
          <div className="grid gap-5">
            <Bone className="h-[5.25rem] w-full" />
            <TableSkeleton columns={5} rows={4} />
          </div>
        }
      >
        {() => sitePageList(props)}
      </Streamed>
    </>
  );
}

/**
 * The pages of one app, the customer site's or Connect's, as Pages lists
 * a location's: the strip counting them by status, then the list, which
 * the strip and a search narrow. Each ends with its footer: the
 * website's on every one of its pages, Connect's on its landing page.
 * Each route checks the access first.
 */
async function sitePageList({
  app,
  status,
  q,
}: {
  app: SitePageApp;
  status: PageFilter | undefined;
  q: string | undefined;
}) {
  const footerKey = FOOTER_KEY_OF[app];
  const [sitePages, footer] = await Promise.all([
    listSitePageSummaries(),
    getFooterSummary(footerKey),
  ]);
  const rows = [
    ...sitePages
      .filter((page) => sitePageAppOf(page.page) === app)
      .map(sitePageRow),
    footerRow(footerKey, footer),
  ];
  const groups: PageGroup[] = rows
    .filter((row) => isPageInList(countedOfRow(row), row.path, { status, q }))
    .map((row) => ({ key: row.key, own: { row }, under: [], folds: false }));

  return (
    <>
      <PageStatusStrip
        pages={rows.map(countedOfRow)}
        status={status}
        q={q}
        hrefOf={(cell) => sitePagesHref(app, { status: cell, q })}
      />
      <Card flush>
        <PageTree
          parts={groups.length > 0 ? [{ key: `part:${app}`, groups }] : []}
          filters={{ searchHref: sitePagesHref(app, { status }), q }}
          empty={emptyOf(q)}
        />
      </Card>
    </>
  );
}
