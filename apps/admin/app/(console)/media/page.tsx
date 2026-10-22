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
import { cx } from "@repo/ui/cx";
import Link from "next/link";
import { Frame } from "../../_components/Card";
import { PageHeader } from "../../_components/PageHeader";
import { Pager, pageOf } from "../../_components/Pager";
import { Bone, Streamed, TileGridSkeleton } from "../../_components/Skeleton";
import { requireAdmin } from "../../_lib/access";
import { PAGE_PARAM, mediaHref } from "../../_lib/routes";
import {
  UPLOADS_NOT_SET_UP,
  listStoredFiles,
  type StoredFile,
} from "../../_lib/uploads";
import { MediaLibrary, type MediaRow } from "./MediaLibrary";

/** How many images a page of the screen holds. */
const PAGE_SIZE = 48;

/**
 * Route: /media?show=unused&page=2. Every image uploaded in the console,
 * newest first, as UploadThing keeps them, each with where it is used: a
 * location's page, working or published, a class's picture, a vehicle's
 * photo, or only a page's past version, which its History shows. The
 * tiles at the head count each standing and narrow the list to it. Images
 * are chosen and deleted together; one on a page is replaced there first,
 * and the delete names what loses the rest (`mediaDeleteImpact`). SUPER
 * only. See docs/261001-locations-and-pages.md, "Images".
 */
export default async function MediaPage({ searchParams }: PageProps<"/media">) {
  await requireAdmin("media.manage");
  const params = await searchParams;
  const show = isMediaFilter(params.show) ? params.show : undefined;
  const page = pageOf(params[PAGE_PARAM]);

  return (
    <>
      <PageHeader
        title="Media"
        description="Every image uploaded in the console, newest first, and where each is used. Choose images to delete them; the delete names what loses them first."
      />
      <div className="mt-6">
        <Streamed
          key={`${show ?? "all"}:${page}`}
          fallback={
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((tile) => (
                  <Bone key={tile} className="h-28 w-full" />
                ))}
              </div>
              <TileGridSkeleton tiles={8} min="14rem" />
            </div>
          }
        >
          {() => mediaList({ show, page })}
        </Streamed>
      </div>
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
  const [files, uses] = await Promise.all([listStoredFiles(), listMediaUses()]);
  if (!files) {
    return (
      <Frame>
        <p className="px-6 py-8 text-center text-sm text-neutral-500">
          {UPLOADS_NOT_SET_UP}
        </p>
      </Frame>
    );
  }
  const now = new Date();
  const rows = files.map((file) => {
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

  return (
    <div className="grid gap-6">
      <nav
        aria-label="Filter by where an image stands"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatTile
          label="All images"
          files={rows.map((row) => row.file)}
          hint="Every image uploaded in the console."
          href={mediaHref()}
          active={show === undefined}
        />
        {(Object.keys(MEDIA_FILTERS) as MediaFilter[]).map((filter) => (
          <StatTile
            key={filter}
            label={MEDIA_FILTER_LABELS[filter]}
            files={of(filter).map((row) => row.file)}
            hint={MEDIA_FILTER_HINTS[filter]}
            href={mediaHref(filter)}
            active={show === filter}
          />
        ))}
      </nav>
      <div>
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
      </div>
    </div>
  );
}

/** One standing at the head of the screen: how many images, how much they hold, and the list narrowed to it. */
function StatTile({
  label,
  files,
  hint,
  href,
  active,
}: {
  label: string;
  files: readonly StoredFile[];
  hint: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "grid content-start gap-1 rounded-xl border bg-white px-4 py-3 transition-colors",
        active
          ? "border-neutral-900 ring-1 ring-neutral-900"
          : "border-neutral-200 hover:border-neutral-300",
      )}
    >
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-neutral-900">
          {files.length}
        </span>
        <span className="text-sm text-neutral-500">
          {formatBytes(files.reduce((sum, file) => sum + file.size, 0))}
        </span>
      </span>
      <span className="text-xs text-neutral-500">{hint}</span>
    </Link>
  );
}
