import {
  MEDIA_FILTERS,
  MEDIA_FILTER_LABELS,
  MEDIA_STATUS_LABELS,
  formatLocalDate,
  isMediaFilter,
  mediaStatusOf,
  pageTitleOf,
  plural,
  type MediaFilter,
  type MediaStatus,
  type MediaUse,
} from "@repo/db";
import { listMediaUses } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { ImageIcon } from "@repo/ui/icons";
import Link from "next/link";
import { Frame, Tile, TileFoot, TileGrid } from "../../_components/Card";
import { CardImage } from "../../_components/CardImage";
import { FilterLinks } from "../../_components/FilterLinks";
import { PageHeader } from "../../_components/PageHeader";
import { Pager, pageOf } from "../../_components/Pager";
import { Streamed, TileGridSkeleton } from "../../_components/Skeleton";
import { requireAdmin } from "../../_lib/access";
import {
  PAGE_PARAM,
  locationPageHref,
  locationPublishHref,
  locationVehicleHref,
  mediaHref,
  vehicleClassHref,
} from "../../_lib/routes";
import {
  UPLOADS_NOT_SET_UP,
  listStoredFiles,
  type StoredFile,
} from "../../_lib/uploads";
import { MediaDelete } from "./MediaDelete";

/** How many images a page of the screen holds. */
const PAGE_SIZE = 48;

const FILTER_OPTIONS = (Object.keys(MEDIA_FILTERS) as MediaFilter[]).map(
  (value) => ({ value, label: MEDIA_FILTER_LABELS[value] }),
);

const STATUS_TONES: Record<MediaStatus, "green" | "blue" | "red" | "amber"> = {
  used: "green",
  earlier: "blue",
  unused: "red",
  recent: "amber",
};

/** A size in bytes as people read it: "820 KB", "3.7 MB". */
function sizeOf(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const totalOf = (files: readonly StoredFile[]) =>
  files.reduce((sum, file) => sum + file.size, 0);

/**
 * Route: /media?show=unused&page=2. Every image uploaded in the console,
 * newest first, as UploadThing keeps them, each with where it is used: a
 * location's page, working or published, a class's picture, a vehicle's
 * photo, or only an earlier publish a location's history shows. Those
 * nothing uses can be deleted, one from its card or all at once; one just
 * uploaded is kept for a day, since a form may not have saved it yet.
 * SUPER only. See docs/261001-locations-and-pages.md, "Images".
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
        description="Every image uploaded in the console, newest first, and where each is used. Delete those nothing uses to free space. An image a location's history shows stays, so the history shows the page as it was."
      />
      <div className="mt-6">
        <FilterLinks
          label="Filter by where an image stands"
          options={FILTER_OPTIONS}
          active={show}
          hrefOf={(value) => mediaHref(value)}
        />
      </div>
      <div className="mt-4">
        <Streamed
          key={`${show ?? "all"}:${page}`}
          fallback={<TileGridSkeleton tiles={8} min="14rem" />}
        >
          {() => mediaList({ show, page })}
        </Streamed>
      </div>
    </>
  );
}

/** The images of one page of the screen, the totals above them and the way to the others. */
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
  const shown = show
    ? rows.filter((row) =>
        (MEDIA_FILTERS[show] as readonly MediaStatus[]).includes(row.status),
      )
    : rows;
  const free = rows.filter((row) => row.status === "unused").map((r) => r.file);
  const onPage = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-neutral-600">
          {plural(files.length, "image")}, {sizeOf(totalOf(files))}.{" "}
          {free.length > 0
            ? `${plural(free.length, "image")} nothing uses, ${sizeOf(totalOf(free))}.`
            : "Nothing to delete: every image is in use or just uploaded."}
        </p>
        {free.length > 1 ? (
          <MediaDelete
            keys={free.map((file) => file.key)}
            label={`Delete ${plural(free.length, "unused image")}`}
            question={`Delete ${plural(free.length, "unused image")}?`}
            description={`They are removed from storage for good, ${sizeOf(totalOf(free))} in all. Nothing uses them, not even a location's history.`}
          />
        ) : null}
      </div>
      {onPage.length === 0 ? (
        <Frame>
          <p className="px-6 py-8 text-center text-sm text-neutral-500">
            {show
              ? `No images ${MEDIA_FILTER_LABELS[show].toLowerCase()}.`
              : "No images uploaded yet."}
          </p>
        </Frame>
      ) : (
        <TileGrid min="14rem">
          {onPage.map((row) => (
            <MediaTile key={row.file.key} {...row} />
          ))}
        </TileGrid>
      )}
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={shown.length}
        hrefOf={(to) => mediaHref(show, to)}
      />
    </>
  );
}

/** One image: its picture and where it stands, its name, size and day, and its uses or its delete. */
function MediaTile({
  file,
  uses,
  status,
}: {
  file: StoredFile;
  uses: MediaUse[];
  status: MediaStatus;
}) {
  // An earlier publish matters only while nothing else uses the image.
  const listed =
    status === "used" ? uses.filter((use) => use.kind !== "earlier") : uses;

  return (
    <Tile>
      <CardImage
        src={file.url}
        fit="contain"
        sizes="(min-width: 1024px) 14rem, (min-width: 640px) 50vw, 100vw"
        fallback={<ImageIcon className="size-7 text-neutral-300" />}
      >
        <Badge tone={STATUS_TONES[status]}>{MEDIA_STATUS_LABELS[status]}</Badge>
      </CardImage>
      <div className="grid gap-2 px-4 pt-3 pb-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold" title={file.name}>
            {file.name}
          </h3>
          <p className="text-xs text-neutral-500 tabular-nums">
            {sizeOf(file.size)} · {formatLocalDate(file.uploadedAt)}
          </p>
        </div>
        {listed.length > 0 ? (
          <ul className="grid gap-1 text-xs">
            {listed.map((use, index) => (
              <li key={index} className="min-w-0 truncate">
                <UseLink use={use} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-neutral-500">
            {status === "recent"
              ? "Nothing uses it yet. It is kept for a day after its upload, since a form may still save it."
              : "Nothing uses it."}
          </p>
        )}
      </div>
      {status === "unused" ? (
        <TileFoot>
          <MediaDelete
            keys={[file.key]}
            label="Delete"
            question={`Delete ${file.name}?`}
            description={`It is removed from storage for good, ${sizeOf(file.size)}. Nothing uses it, not even a location's history.`}
          />
        </TileFoot>
      ) : null}
    </Tile>
  );
}

/** Where a use is, as a link to it: the page in its editor, the class, the vehicle, the publish. */
function UseLink({ use }: { use: MediaUse }) {
  const link =
    "text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900";
  switch (use.kind) {
    case "page": {
      const copies =
        use.draft && use.published
          ? "published and draft"
          : use.published
            ? "published"
            : "draft";
      return (
        <Link
          href={locationPageHref(use.location.slug, use.page)}
          className={link}
        >
          {use.location.name} · {pageTitleOf(use.page)}, {copies}
        </Link>
      );
    }
    case "earlier":
      return (
        <Link
          href={locationPublishHref(use.location.slug, use.entryId)}
          className={link}
        >
          {use.location.name} · {pageTitleOf(use.page)}, an earlier publish
        </Link>
      );
    case "class":
      return (
        <Link href={vehicleClassHref(use.vehicleClass.id)} className={link}>
          Class {use.vehicleClass.name}
        </Link>
      );
    case "vehicle":
      return (
        <Link
          href={locationVehicleHref(use.location.slug, use.vehicle.id)}
          className={link}
        >
          Vehicle {use.vehicle.plate}
        </Link>
      );
  }
}
