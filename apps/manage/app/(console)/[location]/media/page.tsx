import {
  MEDIA_FILTERS,
  MEDIA_FILTER_HINTS,
  MEDIA_FILTER_LABELS,
  formatBytes,
  isMediaFilter,
  mediaStatusOf,
  type MediaFilter,
  type MediaStatus,
} from "@repo/db";
import { listMediaUses } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, Frame } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { FigureTiles, type Figure } from "@repo/console/FigureTiles";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TileGridSkeleton } from "@repo/console/Skeleton";
import type { BadgeTone } from "@repo/ui/badge";
import { Bone } from "@repo/ui/skeleton";
import { Pager, pageOf } from "../../../_components/Pager";
import { requireAdmin } from "../../../_lib/access";
import { PAGE_PARAM, mediaHref } from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import { listStoredFiles, type StoredFile } from "../../../_lib/uploads";
import { MediaLibrary, type MediaRow } from "./MediaLibrary";

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
 * Route: /~/media?show=unused&page=2. Every image uploaded in the console,
 * newest first, as UploadThing keeps them, each with where it is used: a
 * location's page, working or published, a class's picture, a vehicle's
 * photo, or only a page's past version, which its History shows. The
 * tiles at the head count each standing and narrow the list to it.
 * Images are chosen and deleted together; one on a page is replaced there
 * first, and the delete names what loses the rest (`mediaDeleteImpact`).
 * Console-wide: under a slug it is not found. SUPER only. See
 * docs/261001-locations-and-pages.md, "Images".
 */
export default async function MediaPage({
  params,
  searchParams,
}: PageProps<"/[location]/media">) {
  await requireAdmin("media.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  const show = isMediaFilter(query.show) ? query.show : undefined;
  const page = pageOf(query[PAGE_PARAM]);

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
            <TileGridSkeleton tiles={8} min="14rem" />
          </>
        }
      >
        {() => mediaList({ show, page })}
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
}: {
  show: MediaFilter | undefined;
  page: number;
}) {
  const [stored, uses] = await Promise.all([
    listStoredFiles(),
    listMediaUses(),
  ]);
  if (!stored.ok) {
    return (
      <Frame>
        <EmptyState>{stored.error}</EmptyState>
      </Frame>
    );
  }
  const now = new Date();
  const rows = stored.files.map((file) => {
    const fileUses = uses.get(file.key) ?? [];
    return {
      file,
      uses: fileUses,
      status: mediaStatusOf(file.uploadedAt, fileUses, now),
    };
  });
  const of = (filter: MediaFilter) =>
    rows.filter((row) =>
      (MEDIA_FILTERS[filter] as readonly MediaStatus[]).includes(row.status),
    );
  const shown = show ? of(show) : rows;
  const onPage: MediaRow[] = shown
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(({ file, uses: fileUses, status }) => ({
      key: file.key,
      name: file.name,
      size: file.size,
      uploadedAt: file.uploadedAt.toISOString(),
      url: file.url,
      status,
      uses: fileUses,
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
