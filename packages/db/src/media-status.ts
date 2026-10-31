import type { DeleteImpact } from "./delete-impact";
import { formatBytes } from "./images";
import type { LocationPageRef } from "./location-page-input";
import type { FooterKey } from "./footer-content";
import type { SitePageKey } from "./site-page-input";
import { andList, compareNames } from "./names";
import type { Permission } from "./permissions";

/**
 * The Media screen's rules, pure and browser-safe: where an uploaded file
 * is used, what that makes it, whose it is and so who sees it, and what
 * deleting it takes. The uses are read from the database in ./media; the
 * files from UploadThing, by the admin, which keeps one app per database,
 * so a file this database does not use is no other's.
 */

/** A location's name and slug, as a use names it. */
type LocationRef = { id: string; name: string; slug: string };

/**
 * A page a file is on: a location's, by its section and slug, or one of the
 * site's own, or the footer; with the title the screens give it, "Eagle
 * Square", "Coach charter page", "About us", "Footer".
 */
export type MediaPage =
  | { site: false; location: LocationRef; ref: LocationPageRef; title: string }
  | { site: true; page: SitePageKey | FooterKey; title: string };

/** One key per page, to see a page once. */
export function mediaPageKey(on: MediaPage) {
  return on.site
    ? `site|${on.page}`
    : `${on.location.id}|${on.ref.page}|${on.ref.slug}`;
}

/** Where a page is, as the Media screen names it: "Langkawi · Eagle Square", "Site · About us". */
export function mediaPageName(on: MediaPage) {
  return `${on.site ? "Site" : on.location.name} · ${on.title}`;
}

/** One place a file is used, by its UploadThing key. */
export type MediaUse =
  /** On a page: its working copy, its published copy, or both. */
  | {
      kind: "page";
      on: MediaPage;
      draft: boolean;
      published: boolean;
    }
  /** On a page only as a past version showed it: the newest such publish, by its log entry. */
  | {
      kind: "earlier";
      on: MediaPage;
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

/** How long after its upload a file nothing uses counts as just uploaded: a form may hold it, not yet saved. */
export const MEDIA_GRACE_HOURS = 24;

/**
 * Where a file stands: used by a page, a class or a vehicle; shown only by
 * a page's past version, which the page's History shows as it was
 * published; used by nothing; or used by nothing but just uploaded
 * (`MEDIA_GRACE_HOURS`).
 */
export const MEDIA_STATUSES = ["used", "earlier", "unused", "recent"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  used: "In use",
  earlier: "Past versions only",
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
  earlier: "Past versions only",
  unused: "Unused",
};

/** What each filter holds, in a line. */
export const MEDIA_FILTER_HINTS: Record<MediaFilter, string> = {
  used: "On a page, a class or a vehicle now.",
  earlier:
    "On no page now, but a page's History shows it in a version published before.",
  unused: "Nothing uses it, now or in a page's History.",
};

export function isMediaFilter(value: unknown): value is MediaFilter {
  return typeof value === "string" && Object.hasOwn(MEDIA_FILTERS, value);
}

/**
 * Whether a file is in use now: on a page, working or published, a
 * class's picture or a vehicle's photo. Media never deletes one: it is
 * changed where it is used first.
 */
export function isMediaInUse(uses: readonly MediaUse[]) {
  return uses.some((use) => use.kind !== "earlier");
}

/** What the Media screen says of a file in use, in place of the box that would choose it. */
export const MEDIA_IN_USE_HINT = "In use: change it where it is used";

/**
 * Whose a file is, by where it is used now or in a page's History: the
 * pages' (a location's, the site's own, the footer), the fleet's (a
 * vehicle's photo, a class's picture), both, or nobody's while nothing
 * uses it.
 */
export function mediaOwnersOf(uses: readonly MediaUse[]) {
  return {
    pages: uses.some((use) => use.kind === "page" || use.kind === "earlier"),
    fleet: uses.some((use) => use.kind === "class" || use.kind === "vehicle"),
  };
}

/**
 * Which files an admin sees on the Media screen and in an image field's
 * picker, and so may delete: the pages' with a key to the pages or to the
 * website, the fleet's with the fleet's, and those nothing uses with
 * Media's own. `SUPER` holds every key, so sees every file.
 */
export type MediaReach = { pages: boolean; fleet: boolean; unused: boolean };

/** What the admin's keys (`permissionsOf`) reach of the files. */
export function mediaReachOf(permissions: readonly Permission[]): MediaReach {
  return {
    pages:
      permissions.includes("pages.manage") ||
      permissions.includes("website.manage"),
    fleet: permissions.includes("fleet.manage"),
    unused: permissions.includes("media.manage"),
  };
}

/** Whether the admin sees a file with these uses: one used by both owners shows to either. */
export function isMediaInReach(reach: MediaReach, uses: readonly MediaUse[]) {
  if (uses.length === 0) return reach.unused;
  const owners = mediaOwnersOf(uses);
  return (reach.pages && owners.pages) || (reach.fleet && owners.fleet);
}

/** A file as a delete weighs it. */
export type MediaToDelete = {
  name: string;
  size: number;
  status: MediaStatus;
  uses: readonly MediaUse[];
};

/**
 * Why the files cannot be deleted from Media, or null when they can: one
 * is in use (`isMediaInUse`), where it is changed first, so a public page
 * never changes without a publish and a vehicle or a class never loses
 * its picture from here; or one is not the admin's to see
 * (`isMediaInReach`). A file only a page's History shows may go: no page
 * shows it now, working or published.
 */
export function mediaDeleteRefusal(
  files: readonly MediaToDelete[],
  reach: MediaReach,
): string | null {
  const inUse = files
    .filter((file) => isMediaInUse(file.uses))
    .map((file) => file.name);
  if (inUse.length > 0) {
    const one = inUse.length === 1;
    return `${andList(inUse)} ${one ? "is" : "are"} in use. Change ${one ? "it" : "them"} where ${one ? "it is" : "they are"} used first.`;
  }
  const away = files
    .filter((file) => !isMediaInReach(reach, file.uses))
    .map((file) => file.name);
  if (away.length > 0) {
    return `${andList(away)} ${away.length === 1 ? "is not an image" : "are not images"} your team works with.`;
  }
  return null;
}

/**
 * What deleting the files takes (./delete-impact), with none in use
 * (`mediaDeleteRefusal`): the files themselves, the past versions a
 * page's History shows without them, and any just uploaded, which a form
 * may still hold. Either reaches past the files, so "delete" is typed to
 * confirm. Read in a fixed order, whatever the order the files are chosen
 * in.
 */
export function mediaDeleteImpact(
  files: readonly MediaToDelete[],
): DeleteImpact {
  const [only] = files;
  const size = formatBytes(files.reduce((sum, file) => sum + file.size, 0));
  const lines = [
    files.length === 1 && only
      ? `${only.name}, ${size}, is removed from storage for good.`
      : `${files.length} images, ${size}, are removed from storage for good.`,
  ];
  const uses = files.flatMap((file) => file.uses);

  const pages = new Map<string, number>();
  for (const use of uses) {
    if (use.kind === "earlier") {
      const where = mediaPageName(use.on);
      pages.set(where, (pages.get(where) ?? 0) + 1);
    }
  }
  for (const [where, count] of [...pages].sort(([a], [b]) =>
    compareNames(a, b),
  )) {
    lines.push(
      `${where}: its History shows a past version without ${count === 1 ? "it" : "them"}.`,
    );
  }

  const recent = files.filter((file) => file.status === "recent");
  const [justOne] = recent;
  if (recent.length === 1 && justOne) {
    lines.push(
      `${justOne.name} was uploaded in the last day: a form not saved yet may still use it.`,
    );
  } else if (recent.length > 1) {
    lines.push(
      `${recent.length} of them were uploaded in the last day: a form not saved yet may still use them.`,
    );
  }

  return { lines, confirmWith: lines.length > 1 ? "delete" : null };
}
