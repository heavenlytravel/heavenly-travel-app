"use client";

import {
  MEDIA_IN_USE_HINT,
  MEDIA_STATUS_LABELS,
  formatBytes,
  formatLocalDate,
  isMediaInUse,
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
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Tile, TileGrid } from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { TBody, THead, Table, Td, Th } from "@repo/console/Table";
import { CardImage } from "../../../_components/CardImage";
import { Choices } from "../../../_components/Choices";
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
import {
  MEDIA_VIEWS,
  MEDIA_VIEW_LABELS,
  rememberMediaView,
  type MediaView,
} from "./media-view";

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

const VIEW_OPTIONS = MEDIA_VIEWS.map((value) => ({
  value,
  label: MEDIA_VIEW_LABELS[value],
}));

/**
 * One page of the Media screen, in its card: the bar on top, which
 * chooses every image there or none and switches between the grid and
 * the table, and once some are chosen turns dark, counts them and
 * deletes them; then the images, as cards or as rows, each with a box to
 * choose it. An image in use has no box and says why: it is changed
 * where it is used, never deleted from here. The delete lists what the
 * chosen images reach (`mediaDeleteImpact`), as the server works it out
 * again.
 */
export function MediaLibrary({
  rows,
  view: firstView,
  emptyMessage,
}: {
  rows: MediaRow[];
  /** The view the admin chose last, read from its cookie. */
  view: MediaView;
  emptyMessage: string;
}) {
  const [view, setView] = useState(firstView);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const choosable = rows.filter((row) => !isMediaInUse(row.uses));
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
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <>
      <div
        className={cx(
          "flex min-h-14 flex-wrap items-center justify-between gap-3 px-5 py-2.5 transition-colors",
          dark ? "bg-ink text-white" : "border-b border-hairline text-body",
        )}
      >
        {/* The words take the click too; on a touch screen the row is 44px tall to a finger. */}
        <label className="flex touch-target items-center gap-2.5 text-sm">
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
              Every image here is in use: change it where it is used
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
        ) : (
          <Choices
            label="Show the images as"
            size="sm"
            value={view}
            options={VIEW_OPTIONS}
            onChange={(next) => {
              setView(next);
              rememberMediaView(next);
            }}
          />
        )}
      </div>
      {view === "grid" ? (
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
      ) : (
        <MediaTable rows={rows} chosen={chosen} onToggle={toggle} />
      )}
    </>
  );
}

/** The uses a file lists: a past version matters only while nothing else uses it. */
function listedUses(row: MediaRow) {
  return row.status === "used"
    ? row.uses.filter((use) => use.kind !== "earlier")
    : row.uses;
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
  const inUse = isMediaInUse(row.uses);

  return (
    <Tile>
      <div className="relative">
        <CardImage
          src={row.url}
          fit="contain"
          sizes="(min-width: 1024px) 14rem, (min-width: 640px) 50vw, 100vw"
          fallback={<ImageIcon className="size-7 text-slot" />}
        >
          <Badge dot tone={STATUS_TONES[row.status]}>
            {MEDIA_STATUS_LABELS[row.status]}
          </Badge>
        </CardImage>
        {inUse ? null : (
          // The box round the tick takes the press: 44px on a touch screen.
          <label className="absolute top-2.5 right-2.5 flex size-8 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow-control pointer-coarse:size-11">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              aria-label={`Choose ${row.name}`}
              checked={chosen}
              onChange={onToggle}
            />
          </label>
        )}
      </div>
      <div className="grid gap-2.5 px-4 pt-3 pb-4">
        <div className="min-w-0">
          <h2
            className="truncate text-sm font-semibold text-ink"
            title={row.name}
          >
            {row.name}
          </h2>
          <p className="text-xs text-muted tabular-nums">
            {formatBytes(row.size)} ·{" "}
            {formatLocalDate(new Date(row.uploadedAt))}
          </p>
        </div>
        {inUse ? (
          <p className="text-xs text-muted">{MEDIA_IN_USE_HINT}.</p>
        ) : null}
        <UseList uses={listedUses(row)} />
      </div>
      {/* Last, so it is drawn over the tile's raised parts, its foot too. */}
      {chosen ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-(--layer-raised) rounded-card ring-2 ring-brand ring-inset"
        />
      ) : null}
    </Tile>
  );
}

/** The images as rows: the box, the image and its name, its size and day, where it stands and every place it is used. */
function MediaTable({
  rows,
  chosen,
  onToggle,
}: {
  rows: MediaRow[];
  chosen: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <Table bare>
      <THead>
        <Th />
        <Th>Image</Th>
        <Th align="right">Size</Th>
        <Th>Uploaded</Th>
        <Th>Status</Th>
        <Th>Used in</Th>
      </THead>
      <TBody>
        {rows.map((row) => {
          const inUse = isMediaInUse(row.uses);
          const on = chosen.has(row.key);
          return (
            <tr key={row.key} className={cx(on && "bg-brand-tint")}>
              <Td className="w-10">
                {inUse ? null : (
                  // The cell's height takes the press with the box.
                  <label className="flex touch-target cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand"
                      aria-label={`Choose ${row.name}`}
                      checked={on}
                      onChange={() => onToggle(row.key)}
                    />
                  </label>
                )}
              </Td>
              <Td>
                <span className="flex max-w-80 min-w-48 items-center gap-3">
                  <Image
                    src={row.url}
                    alt=""
                    width={64}
                    height={40}
                    sizes="64px"
                    className="h-10 w-16 shrink-0 rounded border border-card-edge bg-canvas object-contain"
                  />
                  <span
                    className="truncate font-medium text-body"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                </span>
              </Td>
              <Td className="text-right whitespace-nowrap text-muted tabular-nums">
                {formatBytes(row.size)}
              </Td>
              <Td className="whitespace-nowrap text-muted tabular-nums">
                {formatLocalDate(new Date(row.uploadedAt))}
              </Td>
              <Td>
                <span className="grid justify-items-start gap-1">
                  <Badge dot tone={STATUS_TONES[row.status]}>
                    {MEDIA_STATUS_LABELS[row.status]}
                  </Badge>
                  {inUse ? (
                    <span className="text-caption whitespace-nowrap text-muted">
                      {MEDIA_IN_USE_HINT}
                    </span>
                  ) : null}
                </span>
              </Td>
              <Td className="min-w-56">
                <UseList uses={listedUses(row)} />
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );
}

/** Every place a file is used, each a chip that opens it. */
function UseList({ uses }: { uses: readonly MediaUse[] }) {
  if (uses.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {uses.map((use, index) => (
        <li key={index} className="max-w-full min-w-0">
          <UseLink use={use} />
        </li>
      ))}
    </ul>
  );
}

/** A use as a small chip that opens it. */
const USE_CHIP =
  "block truncate rounded-md bg-shade px-2 py-0.5 text-xs text-body transition-colors hover:bg-brand-tint hover:text-navy focus-ring";

/** Where a use is, as a link to it: the page or the footer in its editor, the class, the vehicle, the past version. */
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
