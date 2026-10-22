import { logActivity } from "./activity";
import { MEDIA_RECORD_ID, type Actor } from "./activity-actions";
import { refuse, type Refusal } from "./change";
import { db } from "./client";
import { checkDeleteConfirmed, type DeleteConfirmation } from "./delete-impact";
import type { Prisma } from "./generated/prisma/client";
import { uploadKeyOf } from "./images";
import {
  isLocationPageKey,
  pageContentOf,
  type LocationPageKey,
  type PageContent,
} from "./location-page-input";
import {
  mediaDeleteImpact,
  mediaDeleteRefusal,
  mediaStatusOf,
  type MediaUse,
} from "./media-status";

/**
 * Where the console's uploaded files are used, for the Media screen: the
 * locations' pages, working and published, the vehicle classes' pictures,
 * the vehicles' photos, and the past versions a location's History
 * shows; the delete that takes files off them; and the check that keeps a
 * form opened before the delete from putting a deleted file back. The
 * rules are in ./media-status. See docs/261001-locations-and-pages.md,
 * "Images".
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

/** The rows the uses are read from, in one read. */
async function readSources(client: Prisma.TransactionClient) {
  const [locations, pages, publishes, classes, photos] = await Promise.all([
    client.location.findMany({ select: { id: true, name: true, slug: true } }),
    client.locationPage.findMany({
      select: { locationId: true, page: true, draft: true, published: true },
    }),
    client.activityLog.findMany({
      where: { entityType: "location", action: "location.page.published" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, entityId: true, before: true, after: true },
    }),
    client.vehicleClass.findMany({
      where: { imageUrl: { not: null } },
      select: { id: true, name: true, imageUrl: true },
    }),
    client.vehiclePhoto.findMany({
      select: {
        id: true,
        url: true,
        vehicle: {
          select: {
            id: true,
            plate: true,
            locationId: true,
            location: { select: { slug: true } },
            _count: { select: { photos: true } },
          },
        },
      },
    }),
  ]);
  return { locations, pages, publishes, classes, photos };
}

type Sources = Awaited<ReturnType<typeof readSources>>;

/**
 * Every use of every file, by its UploadThing key. A page's working and
 * published copies are one use; a past version is named by the newest
 * publish that showed the file, and only while the location stands, since
 * a deleted location's history has no page.
 */
function usesOf(sources: Sources): Map<string, MediaUse[]> {
  const { locations, pages, publishes, classes, photos } = sources;
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

/** Every use of every file, by its UploadThing key, in a few queries. */
export async function listMediaUses(): Promise<Map<string, MediaUse[]>> {
  return usesOf(await readSources(db));
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

/**
 * Why a save may not store these addresses, or null when it may: one is a
 * file the Media screen deleted (its log entries name them), held by a
 * form opened before the delete. Saving it would put a file that is gone
 * back on a page, a class or a vehicle. `what` names it in the sentence,
 * "A photo"; `field` is the form's field it is about.
 */
export async function deletedMediaRefusal(
  client: Prisma.TransactionClient,
  urls: readonly (string | null)[],
  what: string,
  field?: string,
): Promise<Refusal | null> {
  const keys = urls.flatMap((url) => {
    const key = url ? uploadKeyOf(url) : null;
    return key ? [key] : [];
  });
  if (keys.length === 0) return null;
  const entries = await client.activityLog.findMany({
    where: { action: "media.deleted", entityId: MEDIA_RECORD_ID },
    select: { before: true },
  });
  const deleted = new Set(
    entries.flatMap(({ before }) => {
      const files = (before as { files?: unknown } | null)?.files;
      return Array.isArray(files)
        ? files.flatMap((file) =>
            file && typeof file === "object" && "key" in file
              ? [String(file.key)]
              : [],
          )
        : [];
    }),
  );
  return keys.some((key) => deleted.has(key))
    ? refuse(
        `${what} was deleted on the Media screen since this form opened. Take it out, then save.`,
        field,
      )
    : null;
}

/** A stored file as a delete weighs it: UploadThing's record of it. */
export type StoredMedia = {
  key: string;
  name: string;
  size: number;
  uploadedAt: Date;
};

/** What taking the files off their uses came to: whether a vehicle or a class changed, for the pages to refresh; or why not. */
export type MediaReleased = { ok: true; fleetChanged: boolean } | Refusal;

/**
 * Takes the files off what uses them, once the admin confirmed what that
 * takes as it stands (`mediaDeleteImpact`, ./delete-impact): each vehicle
 * loses those of its photos and each class its picture, logged in their
 * own history; a page's past version stays in the log and shows without
 * them. A file on a location's page is refused (`mediaDeleteRefusal`).
 * The photos and pictures changed are those of the same read the impact
 * was weighed on, so nothing is taken that was not shown. The files
 * themselves are deleted from storage after, by the admin.
 */
export async function releaseMedia(
  actor: Actor,
  files: readonly StoredMedia[],
  confirmation: DeleteConfirmation,
): Promise<MediaReleased> {
  return db.$transaction(
    async (tx) => {
      const sources = await readSources(tx);
      const uses = usesOf(sources);
      const now = new Date();
      const weighed = files.map((file) => {
        const fileUses = uses.get(file.key) ?? [];
        return {
          name: file.name,
          size: file.size,
          uses: fileUses,
          status: mediaStatusOf(file.uploadedAt, fileUses, now),
        };
      });
      const refusal = mediaDeleteRefusal(weighed);
      if (refusal) return refuse(refusal);
      const confirmed = checkDeleteConfirmed(
        mediaDeleteImpact(weighed),
        confirmation,
      );
      if (!confirmed.ok) return confirmed;

      const keys = new Set(files.map((file) => file.key));
      const isReleased = (url: string) => keys.has(uploadKeyOf(url) ?? "");

      const byVehicle = new Map<string, Sources["photos"]>();
      for (const photo of sources.photos.filter((p) => isReleased(p.url))) {
        byVehicle.set(photo.vehicle.id, [
          ...(byVehicle.get(photo.vehicle.id) ?? []),
          photo,
        ]);
      }
      for (const [vehicleId, released] of byVehicle) {
        const { vehicle } = released[0]!;
        await tx.vehiclePhoto.deleteMany({
          where: { id: { in: released.map((photo) => photo.id) } },
        });
        await logActivity(tx, actor, {
          action: "vehicle.updated",
          entityId: vehicleId,
          before: { photos: vehicle._count.photos },
          after: { photos: vehicle._count.photos - released.length },
          locationIds: [vehicle.locationId],
        });
      }

      const pictures = sources.classes.filter(
        (vehicleClass) =>
          vehicleClass.imageUrl !== null && isReleased(vehicleClass.imageUrl),
      );
      for (const vehicleClass of pictures) {
        // Cleared only while it is still that picture.
        await tx.vehicleClass.updateMany({
          where: { id: vehicleClass.id, imageUrl: vehicleClass.imageUrl },
          data: { imageUrl: null },
        });
        await logActivity(tx, actor, {
          action: "vehicle-class.updated",
          entityId: vehicleClass.id,
          before: { imageUrl: vehicleClass.imageUrl },
          after: { imageUrl: null },
        });
      }

      return { ok: true, fleetChanged: byVehicle.size + pictures.length > 0 };
    },
    // Every page, publish and photo is read to weigh the delete.
    { timeout: 20_000 },
  );
}
