import {
  MEDIA_FILTERS,
  MEDIA_FILTER_HINTS,
  MEDIA_FILTER_LABELS,
  formatBytes,
  isMediaFilter,
  type MediaFilter,
  type MediaStatus,
} from "@repo/db";
import { InfoTip } from "@repo/ui/info-tip";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Card, Frame } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { FigureTiles, type Figure } from "@repo/console/FigureTiles";
import { PageHeader } from "@repo/console/PageHeader";
import {
  Streamed,
  TableSkeleton,
  TileGridSkeleton,
} from "@repo/console/Skeleton";
import type { BadgeTone } from "@repo/ui/badge";
import { Bone } from "@repo/ui/skeleton";
import { Pager, pageOf } from "../../../_components/Pager";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { listMediaFiles } from "../../../_lib/media";
import { PAGE_PARAM, mediaHref } from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import type { StoredFile } from "../../../_lib/uploads";
import { MediaLibrary, type MediaRow } from "./MediaLibrary";
import { MEDIA_VIEW_COOKIE, mediaViewOf, type MediaView } from "./media-view";

/** How many images a page of the screen holds. */
const PAGE_SIZE = 48;

/** The filters, in the order of their tiles. */
const FILTERS = Object.keys(MEDIA_FILTERS) as MediaFilter[];

/** Each tile's disc: the colour of the status chip its images carry. */
const FILTER_TONES: Record<MediaFilter, BadgeTone> = {
  used: "green",
  earlier: "navy",
  unused: "neutral",
};

/** What each filter holds, in the one tip beside the title. */
const FILTERS_TIP = FILTERS.map((filter) => {
  const hint = MEDIA_FILTER_HINTS[filter];
  return `${MEDIA_FILTER_LABELS[filter]}: ${hint.charAt(0).toLowerCase()}${hint.slice(1)}`;
}).join(" ");

/**
 * Route: /~/media?show=unused&page=2. The images uploaded in the console
 * that the admin's team works with, newest first, as UploadThing keeps
 * them: the pages' to the pages and the website, the fleet's to the
 * fleet, those nothing uses to Media's key, every one to SUPER
 * (`isMediaInReach`). Each lists every place it is used, a link to where
 * it is changed: a location's page, working or published, the footer, a
 * class's picture, a vehicle's photo, or only a page's past version,
 * which its History shows. The tiles at the head count each standing and
 * narrow the list to it. Shown as a grid or a table, the choice
 * remembered. Images are chosen and deleted together; one in use cannot
 * be chosen, and the delete names what the rest reach
 * (`mediaDeleteImpact`). Console-wide: under a slug it is not found. See
 * docs/261001-locations-and-pages.md, "Images".
 */
export default async function MediaPage({
  params,
  searchParams,
}: PageProps<"/[location]/media">) {
  await requireAdmin("media.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const [query, store] = await Promise.all([searchParams, cookies()]);
  const show = isMediaFilter(query.show) ? query.show : undefined;
  const page = pageOf(query[PAGE_PARAM]);
  const view = mediaViewOf(store.get(MEDIA_VIEW_COOKIE)?.value);

  return (
    <>
      <PageHeader title="Media" badge={<InfoTip text={FILTERS_TIP} />} />
      <Streamed
        key={`${show ?? "all"}:${page}`}
        fallback={
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {[0, 1, 2, 3].map((tile) => (
                <Bone key={tile} className="h-[5.5rem] w-full" />
              ))}
            </div>
            {view === "table" ? (
              <TableSkeleton columns={6} />
            ) : (
              <TileGridSkeleton tiles={8} min="14rem" />
            )}
          </>
        }
      >
        {() => mediaList({ show, page, view })}
      </Streamed>
    </>
  );
}

/** A tile's number: how many images, and how much they hold. */
function filesValue(files: readonly StoredFile[]) {
  return (
    <>
      {files.length}
      <span className="ml-2 font-sans text-caption text-muted">
        {formatBytes(files.reduce((sum, file) => sum + file.size, 0))}
      </span>
    </>
  );
}

/** The tiles, then one page of the images and the way to the others. */
async function mediaList({
  show,
  page,
  view,
}: {
  show: MediaFilter | undefined;
  page: number;
  view: MediaView;
}) {
  const listed = await listMediaFiles(await getPermissions());
  if (!listed.ok) {
    return (
      <Frame>
        <EmptyState>{listed.error}</EmptyState>
      </Frame>
    );
  }
  const rows = listed.files;
  const of = (filter: MediaFilter) =>
    rows.filter((row) =>
      (MEDIA_FILTERS[filter] as readonly MediaStatus[]).includes(row.status),
    );
  const shown = show ? of(show) : rows;
  const onPage: MediaRow[] = shown
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(({ file, uses, status }) => ({
      key: file.key,
      name: file.name,
      size: file.size,
      uploadedAt: file.uploadedAt.toISOString(),
      url: file.url,
      status,
      uses,
    }));
  const figures: Figure[] = [
    {
      key: "all",
      label: "All images",
      value: filesValue(rows.map((row) => row.file)),
      tone: "brand",
      href: mediaHref(),
      current: show === undefined,
    },
    ...FILTERS.map((filter): Figure => ({
      key: filter,
      label: MEDIA_FILTER_LABELS[filter],
      value: filesValue(of(filter).map((row) => row.file)),
      tone: FILTER_TONES[filter],
      href: mediaHref(filter),
      current: show === filter,
    })),
  ];

  return (
    <>
      <FigureTiles label="Images by where they stand" figures={figures} />
      <Card flush className="overflow-hidden">
        <MediaLibrary
          key={`${show ?? "all"}:${page}`}
          rows={onPage}
          view={view}
          emptyMessage={
            show
              ? `No images ${MEDIA_FILTER_LABELS[show].toLowerCase()}.`
              : "No images uploaded yet."
          }
        />
        <Pager
          page={page}
          pageSize={PAGE_SIZE}
          total={shown.length}
          hrefOf={(to) => mediaHref(show, to)}
        />
      </Card>
    </>
  );
}
