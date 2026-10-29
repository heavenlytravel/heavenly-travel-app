"use client";

import {
  MEDIA_STATUS_LABELS,
  formatBytes,
  formatLocalDate,
  isOnPage,
  mediaDeleteImpact,
  mediaPageName,
  plural,
  type MediaStatus,
  type MediaUse,
} from "@repo/db";
import { Badge, type BadgeTone } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { ImageIcon } from "@repo/ui/icons";
import Link from "next/link";
import { useState } from "react";
import { Tile, TileGrid } from "@repo/console/Card";
import { CardImage } from "../../../_components/CardImage";
import { DeleteButton } from "../../../_components/DeleteButton";
import {
  classHref,
  locationPageHref,
  locationPublishHref,
  sitePageHref,
  sitePagePublishHref,
  vehicleHref,
} from "../../../_lib/routes";
import { deleteMediaAction } from "./actions";

/** One image as the screen lists it, with where it stands and its uses. */
export type MediaRow = {
  key: string;
  name: string;
  size: number;
  /** ISO. */
  uploadedAt: string;
  url: string;
  status: MediaStatus;
  uses: MediaUse[];
};

/** Each standing's chip: in use is done (green), a past version is in hand (navy), unused has stepped aside (grey), just uploaded waits (amber). */
const STATUS_TONES: Record<MediaStatus, BadgeTone> = {
  used: "green",
  earlier: "navy",
  unused: "neutral",
  recent: "amber",
};

/**
 * One page of the Media screen, in its card: the bar on top, which
 * chooses every image there or none, and once some are chosen turns dark,
 * counts them and deletes them, then the images as cards, each with a box
 * to choose it. An image on a location's page cannot be chosen: it is
 * replaced in the page editor first. The delete lists what the chosen
 * images leave behind (`mediaDeleteImpact`), as the server works it out
 * again.
 */
export function MediaLibrary({
  rows,
  emptyMessage,
}: {
  rows: MediaRow[];
  emptyMessage: string;
}) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const choosable = rows.filter((row) => !isOnPage(row.uses));
  const picked = rows.filter((row) => chosen.has(row.key));
  const size = picked.reduce((sum, row) => sum + row.size, 0);
  const all = choosable.length > 0 && picked.length === choosable.length;
  const dark = picked.length > 0;

  const toggle = (key: string) =>
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (rows.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div
        className={cx(
          "flex min-h-14 flex-wrap items-center justify-between gap-3 px-5 py-2.5 transition-colors",
          dark ? "bg-ink text-white" : "border-b border-hairline text-body",
        )}
      >
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-brand"
            checked={all}
            disabled={choosable.length === 0}
            onChange={() =>
              setChosen(
                all ? new Set() : new Set(choosable.map((row) => row.key)),
              )
            }
          />
          {dark ? (
            <span>
              <span className="font-bold">
                {plural(picked.length, "image")} chosen
              </span>
              <span className="text-white/75"> · {formatBytes(size)}</span>
            </span>
          ) : choosable.length > 0 ? (
            "Choose images to delete them"
          ) : (
            <span className="text-muted">
              Every image here is on a page: replace it there to delete it
            </span>
          )}
        </label>
        {dark ? (
          <div className="flex items-start gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChosen(new Set())}
            >
              Clear
            </Button>
            <DeleteButton
              look="bar"
              label={`Delete ${plural(picked.length, "image")}`}
              title={`Delete ${plural(picked.length, "image")}?`}
              impact={mediaDeleteImpact(picked)}
              note="This cannot be undone."
              action={(seen, typed) =>
                deleteMediaAction(
                  picked.map((row) => row.key),
                  seen,
                  typed,
                )
              }
              doneMessage={`Deleted ${plural(picked.length, "image")}.`}
              onDeleted={() => setChosen(new Set())}
            />
          </div>
        ) : null}
      </div>
      <div className="p-5">
        <TileGrid min="14rem">
          {rows.map((row) => (
            <MediaTile
              key={row.key}
              row={row}
              chosen={chosen.has(row.key)}
              onToggle={() => toggle(row.key)}
            />
          ))}
        </TileGrid>
      </div>
    </>
  );
}

/** One image: its picture and where it stands, the box that chooses it, its name, size and day, and its uses. */
function MediaTile({
  row,
  chosen,
  onToggle,
}: {
  row: MediaRow;
  chosen: boolean;
  onToggle: () => void;
}) {
  const onPage = isOnPage(row.uses);
  // A past version matters only while nothing else uses the image.
  const listed =
    row.status === "used"
      ? row.uses.filter((use) => use.kind !== "earlier")
      : row.uses;

  return (
    <Tile>
      {chosen ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-2 rounded-card ring-2 ring-brand ring-inset"
        />
      ) : null}
      <div className="relative">
        <CardImage
          src={row.url}
          fit="contain"
          sizes="(min-width: 1024px) 14rem, (min-width: 640px) 50vw, 100vw"
          fallback={<ImageIcon className="size-7 text-slate-300" />}
        >
          <Badge dot tone={STATUS_TONES[row.status]}>
            {MEDIA_STATUS_LABELS[row.status]}
          </Badge>
        </CardImage>
        <label
          className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-md bg-white/90 shadow-control"
          title={
            onPage
              ? "On a location's page: replace it there, then delete it here"
              : undefined
          }
        >
          <input
            type="checkbox"
            className="size-4 accent-brand"
            aria-label={`Choose ${row.name}`}
            checked={chosen}
            disabled={onPage}
            onChange={onToggle}
          />
        </label>
      </div>
      <div className="grid gap-2.5 px-4 pt-3 pb-4">
        <div className="min-w-0">
          <h3
            className="truncate text-sm font-semibold text-ink"
            title={row.name}
          >
            {row.name}
          </h3>
          <p className="text-xs text-muted tabular-nums">
            {formatBytes(row.size)} ·{" "}
            {formatLocalDate(new Date(row.uploadedAt))}
          </p>
        </div>
        {listed.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {listed.map((use, index) => (
              <li key={index} className="max-w-full min-w-0">
                <UseLink use={use} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Tile>
  );
}

/** A use as a small chip that opens it. */
const USE_CHIP =
  "block truncate rounded-md bg-shade px-2 py-0.5 text-xs text-body transition-colors hover:bg-brand-tint hover:text-navy";

/** Where a use is, as a link to it: the page in its editor, the class, the vehicle, the past version. */
function UseLink({ use }: { use: MediaUse }) {
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
          href={
            use.on.site
              ? sitePageHref(use.on.page)
              : locationPageHref(use.on.location.slug, use.on.ref)
          }
          className={USE_CHIP}
        >
          {mediaPageName(use.on)}, {copies}
        </Link>
      );
    }
    case "earlier":
      return (
        <Link
          href={
            use.on.site
              ? sitePagePublishHref(use.entryId)
              : locationPublishHref(use.on.location.slug, use.entryId)
          }
          className={USE_CHIP}
        >
          {mediaPageName(use.on)}, a past version
        </Link>
      );
    case "class":
      return (
        <Link href={classHref(null, use.vehicleClass.id)} className={USE_CHIP}>
          Class {use.vehicleClass.name}
        </Link>
      );
    case "vehicle":
      return (
        <Link href={vehicleHref(null, use.vehicle.id)} className={USE_CHIP}>
          Vehicle {use.vehicle.plate}
        </Link>
      );
  }
}
