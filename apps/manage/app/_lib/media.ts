import "server-only";
import {
  isMediaInReach,
  mediaReachOf,
  mediaStatusOf,
  type MediaStatus,
  type MediaUse,
  type Permission,
} from "@repo/db";
import { listMediaUses } from "@repo/db/server";
import { listStoredFiles, type StoredFile } from "./uploads";

/** A stored file with its uses and where it stands. */
export type MediaFile = {
  file: StoredFile;
  uses: MediaUse[];
  status: MediaStatus;
};

/** The files an admin sees, or why storage cannot be read. */
export type MediaFiles =
  { ok: true; files: MediaFile[] } | { ok: false; error: string };

/**
 * The stored files an admin with these keys (`getPermissions`) sees,
 * newest first, each with its uses and where it stands: the pages' to
 * the pages and the website, the fleet's to the fleet, those nothing uses
 * to Media's key, every one to `SUPER` (`isMediaInReach`). For the Media
 * screen and the image fields' picker, which show the same files, so one
 * picture serves several places.
 */
export async function listMediaFiles(
  permissions: readonly Permission[],
): Promise<MediaFiles> {
  const [stored, uses] = await Promise.all([
    listStoredFiles(),
    listMediaUses(),
  ]);
  if (!stored.ok) return stored;
  const reach = mediaReachOf(permissions);
  const now = new Date();
  const files = stored.files.flatMap((file) => {
    const fileUses = uses.get(file.key) ?? [];
    return isMediaInReach(reach, fileUses)
      ? [
          {
            file,
            uses: fileUses,
            status: mediaStatusOf(file.uploadedAt, fileUses, now),
          },
        ]
      : [];
  });
  return { ok: true, files };
}
