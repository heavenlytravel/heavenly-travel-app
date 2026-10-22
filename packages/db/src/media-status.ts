import type { LocationPageKey } from "./location-page-input";

/**
 * The Media screen's rules, pure and browser-safe: where an uploaded file
 * is used, what that makes it, and whether it may be deleted. The uses
 * are read from the database in ./media; the files from UploadThing, by
 * the admin, which keeps one app per database, so a file this database
 * does not use is no other's.
 */

/** A location's name and slug, as a use names it. */
type LocationRef = { id: string; name: string; slug: string };

/** One place a file is used, by its UploadThing key. */
export type MediaUse =
  /** On a location's page: its working copy, its published copy, or both. */
  | {
      kind: "page";
      location: LocationRef;
      page: LocationPageKey;
      draft: boolean;
      published: boolean;
    }
  /** On a page only as an earlier publish showed it: the newest such publish, by its log entry. */
  | {
      kind: "earlier";
      location: LocationRef;
      page: LocationPageKey;
      entryId: string;
    }
  /** A vehicle class's picture. */
  | { kind: "class"; vehicleClass: { id: string; name: string } }
  /** One of a vehicle's photos, inside the location it is based at. */
  | {
      kind: "vehicle";
      vehicle: { id: string; plate: string };
      location: { slug: string };
    };

/**
 * How long a file nothing uses is kept after it is uploaded: a form may
 * have it and not be saved yet, such as a page being written.
 */
export const MEDIA_GRACE_HOURS = 24;

/**
 * Where a file stands: used by a page, a class or a vehicle; shown only by
 * an earlier publish in a location's history, which keeps it so the
 * history shows the page as it was; used by nothing, and so free to
 * delete; or used by nothing but just uploaded (`MEDIA_GRACE_HOURS`).
 */
export const MEDIA_STATUSES = ["used", "earlier", "unused", "recent"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  used: "In use",
  earlier: "In history only",
  unused: "Unused",
  recent: "Just uploaded",
};

/** Where a file uploaded at `uploadedAt`, with its uses, stands at `now`. */
export function mediaStatusOf(
  uploadedAt: Date,
  uses: readonly MediaUse[],
  now: Date,
): MediaStatus {
  if (uses.some((use) => use.kind !== "earlier")) return "used";
  if (uses.length > 0) return "earlier";
  return now.getTime() - uploadedAt.getTime() < MEDIA_GRACE_HOURS * 3_600_000
    ? "recent"
    : "unused";
}

/** The Media screen's filter: each shows files of these statuses. */
export const MEDIA_FILTERS = {
  used: ["used"],
  earlier: ["earlier"],
  unused: ["unused", "recent"],
} as const satisfies Record<string, readonly MediaStatus[]>;
export type MediaFilter = keyof typeof MEDIA_FILTERS;

export const MEDIA_FILTER_LABELS: Record<MediaFilter, string> = {
  used: "In use",
  earlier: "In history only",
  unused: "Unused",
};

export function isMediaFilter(value: unknown): value is MediaFilter {
  return typeof value === "string" && Object.hasOwn(MEDIA_FILTERS, value);
}
