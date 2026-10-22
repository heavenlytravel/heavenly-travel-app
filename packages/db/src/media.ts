import { logActivity } from "./activity";
import { MEDIA_RECORD_ID, type Actor } from "./activity-actions";
import { db } from "./client";
import { uploadKeyOf } from "./images";
import {
  isLocationPageKey,
  pageContentOf,
  type LocationPageKey,
  type PageContent,
} from "./location-page-input";
import type { MediaUse } from "./media-status";

/**
 * Where the console's uploaded files are used, for the Media screen: the
 * locations' pages, working and published, the vehicle classes' pictures,
 * the vehicles' photos, and the earlier publishes a location's history
 * shows. The rules are in ./media-status. See
 * docs/261001-locations-and-pages.md, "Images".
 */

/** The keys of the images on a page: its share image, its hero and its highlights'. */
function pageImageKeys(content: PageContent): string[] {
  return [
    content.shareImage,
    content.heroImage,
    ...content.highlights.map((highlight) => highlight.image),
  ].flatMap((image) => (image ? [image.key] : []));
}

/** The keys of the images a published page showed, from a log entry's `{ page, content }`. */
function snapshotKeys(page: LocationPageKey, snapshot: unknown): string[] {
  const content =
    snapshot !== null && typeof snapshot === "object" && "content" in snapshot
      ? snapshot.content
      : null;
  return content ? pageImageKeys(pageContentOf(page, content)) : [];
}

/**
 * Every use of every file, by its UploadThing key, in a few queries. A
 * page's working and published copies are one use; an earlier publish is
 * named by the newest entry that showed the file, and only while the
 * location stands, since a deleted location's history has no page.
 */
export async function listMediaUses(): Promise<Map<string, MediaUse[]>> {
  const [locations, pages, publishes, classes, photos] = await Promise.all([
    db.location.findMany({ select: { id: true, name: true, slug: true } }),
    db.locationPage.findMany({
      select: { locationId: true, page: true, draft: true, published: true },
    }),
    db.activityLog.findMany({
      where: { entityType: "location", action: "location.page.published" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, entityId: true, before: true, after: true },
    }),
    db.vehicleClass.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, name: true, imageUrl: true },
    }),
    db.vehiclePhoto.findMany({
      select: {
        url: true,
        vehicle: {
          select: {
            id: true,
            plate: true,
            location: { select: { slug: true } },
          },
        },
      },
    }),
  ]);
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const uses = new Map<string, MediaUse[]>();
  const add = (key: string | null, use: MediaUse) => {
    if (key) uses.set(key, [...(uses.get(key) ?? []), use]);
  };

  for (const row of pages) {
    const location = locationById.get(row.locationId);
    if (!location || !isLocationPageKey(row.page)) continue;
    const draft = new Set(pageImageKeys(pageContentOf(row.page, row.draft)));
    const published = new Set(
      row.published
        ? pageImageKeys(pageContentOf(row.page, row.published))
        : [],
    );
    for (const key of new Set([...draft, ...published])) {
      add(key, {
        kind: "page",
        location,
        page: row.page,
        draft: draft.has(key),
        published: published.has(key),
      });
    }
  }

  // Newest first, so the first entry seen for a file on a page names it.
  const seen = new Set<string>();
  for (const entry of publishes) {
    const location = locationById.get(entry.entityId);
    const page = (entry.after as { page?: unknown } | null)?.page;
    if (!location || !isLocationPageKey(page)) continue;
    const keys = new Set([
      ...snapshotKeys(page, entry.before),
      ...snapshotKeys(page, entry.after),
    ]);
    for (const key of keys) {
      const where = `${key}|${location.id}|${page}`;
      if (seen.has(where)) continue;
      seen.add(where);
      add(key, { kind: "earlier", location, page, entryId: entry.id });
    }
  }

  for (const vehicleClass of classes) {
    if (!vehicleClass.imageUrl) continue;
    add(uploadKeyOf(vehicleClass.imageUrl), {
      kind: "class",
      vehicleClass: { id: vehicleClass.id, name: vehicleClass.name },
    });
  }

  for (const photo of photos) {
    add(uploadKeyOf(photo.url), {
      kind: "vehicle",
      vehicle: { id: photo.vehicle.id, plate: photo.vehicle.plate },
      location: photo.vehicle.location,
    });
  }

  return uses;
}

/** One file as the Media screen deleted it. */
export type DeletedMedia = { key: string; name: string; size: number };

/**
 * Logs the files the Media screen deleted from storage. The delete is
 * UploadThing's, outside the database, so the entry follows it and names
 * only what it removed.
 */
export async function logMediaDeleted(
  actor: Actor,
  files: readonly DeletedMedia[],
): Promise<void> {
  if (files.length === 0) return;
  await db.$transaction((tx) =>
    logActivity(tx, actor, {
      action: "media.deleted",
      entityId: MEDIA_RECORD_ID,
      before: { files: files.map((file) => ({ ...file })) },
    }),
  );
}
