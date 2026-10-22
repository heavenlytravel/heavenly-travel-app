"use client";

import {
  MEDIA_STATUS_LABELS,
  formatBytes,
  formatLocalDate,
  isOnPage,
  mediaDeleteImpact,
  pageTitleOf,
  plural,
  type MediaStatus,
  type MediaUse,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { ImageIcon } from "@repo/ui/icons";
import Link from "next/link";
import { useState } from "react";
import { Frame, Tile, TileGrid } from "../../_components/Card";
import { CardImage } from "../../_components/CardImage";
import { DeleteButton } from "../../_components/DeleteButton";
import {
  locationPageHref,
  locationPublishHref,
  locationVehicleHref,
  vehicleClassHref,
} from "../../_lib/routes";
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

const STATUS_TONES: Record<MediaStatus, "green" | "blue" | "red" | "amber"> = {
  used: "green",
  earlier: "blue",
  unused: "red",
  recent: "amber",
};

/**
 * One page of the Media screen: the images as cards, each with a box to
 * choose it, and the bar above them that counts what is chosen and
 * deletes it. An image on a location's page cannot be chosen: it is
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

  const toggle = (key: string) =>
    setChosen((was) => {
      const next = new Set(was);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (rows.length === 0) {
    return (
      <Frame>
        <p className="px-6 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      </Frame>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <label className="flex items-center gap-2 text-sm text-slate-700">
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
          {picked.length > 0
            ? `${plural(picked.length, "image")} chosen, ${formatBytes(size)}`
            : choosable.length > 0
              ? "Choose images to delete them"
              : "Every image here is on a page: replace it there to delete it"}
        </label>
        {picked.length > 0 ? (
          <div className="flex items-start gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChosen(new Set())}
            >
              Clear
            </Button>
            <DeleteButton
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
      <div className={cx("relative", chosen && "ring-2 ring-brand")}>
        <CardImage
          src={row.url}
          fit="contain"
          sizes="(min-width: 1024px) 14rem, (min-width: 640px) 50vw, 100vw"
          fallback={<ImageIcon className="size-7 text-slate-300" />}
        >
          <Badge tone={STATUS_TONES[row.status]}>
            {MEDIA_STATUS_LABELS[row.status]}
          </Badge>
        </CardImage>
        <label
          className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-md bg-white/90 shadow-sm"
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
      <div className="grid gap-2 px-4 pt-3 pb-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold" title={row.name}>
            {row.name}
          </h3>
          <p className="text-xs text-slate-500 tabular-nums">
            {formatBytes(row.size)} ·{" "}
            {formatLocalDate(new Date(row.uploadedAt))}
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
        ) : null}
      </div>
    </Tile>
  );
}

const LINK =
  "text-slate-700 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900";

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
          href={locationPageHref(use.location.slug, use.page)}
          className={LINK}
        >
          {use.location.name} · {pageTitleOf(use.page)}, {copies}
        </Link>
      );
    }
    case "earlier":
      return (
        <Link
          href={locationPublishHref(use.location.slug, use.entryId)}
          className={LINK}
        >
          {use.location.name} · {pageTitleOf(use.page)}, a past version
        </Link>
      );
    case "class":
      return (
        <Link href={vehicleClassHref(use.vehicleClass.id)} className={LINK}>
          Class {use.vehicleClass.name}
        </Link>
      );
    case "vehicle":
      return (
        <Link
          href={locationVehicleHref(use.location.slug, use.vehicle.id)}
          className={LINK}
        >
          Vehicle {use.vehicle.plate}
        </Link>
      );
  }
}
