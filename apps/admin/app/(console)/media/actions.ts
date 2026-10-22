"use server";

import { listMediaUses, logMediaDeleted, mediaStatusOf } from "@repo/db/server";
import { actorOf, getAdmin } from "../../_lib/access";
import { FORBIDDEN_MESSAGE, STALE_MESSAGE } from "../../_lib/action-state";
import {
  UPLOADS_NOT_SET_UP,
  deleteStoredFiles,
  listStoredFiles,
} from "../../_lib/uploads";

/** What a delete did: the files it removed, and those it kept because they are no longer free to go. */
export type MediaDeleted =
  { deleted: number; kept: number } | { error: string };

/** The most files one delete takes: more than the screen ever asks at once. */
const MAX_KEYS = 2000;

/**
 * Deletes the files from storage for good, by their keys, those still
 * free to go when the delete runs: stored, used by nothing, not even an
 * earlier publish, and past the day a form may hold a new upload
 * (`mediaStatusOf`). The rest are kept and counted, such as a file saved
 * on a page since the screen was read. What went is logged. SUPER only.
 */
export async function deleteMediaAction(keys: string[]): Promise<MediaDeleted> {
  const admin = await getAdmin("media.manage");
  if (!admin) return { error: FORBIDDEN_MESSAGE };
  if (
    !Array.isArray(keys) ||
    keys.length === 0 ||
    keys.length > MAX_KEYS ||
    !keys.every((key) => typeof key === "string" && key !== "")
  ) {
    return { error: STALE_MESSAGE };
  }

  const [files, uses] = await Promise.all([listStoredFiles(), listMediaUses()]);
  if (!files) {
    return { error: UPLOADS_NOT_SET_UP };
  }
  const asked = new Set(keys);
  const now = new Date();
  const free = files.filter(
    (file) =>
      asked.has(file.key) &&
      mediaStatusOf(file.uploadedAt, uses.get(file.key) ?? [], now) ===
        "unused",
  );
  if (free.length === 0) {
    return {
      error:
        asked.size === 1
          ? "This image is in use now, or already gone. Reload Media to see where it stands."
          : "None of these images is free to delete now. Reload Media to see where they stand.",
    };
  }

  const deleted = await deleteStoredFiles(free.map((file) => file.key));
  await logMediaDeleted(
    actorOf(admin),
    free.map(({ key, name, size }) => ({ key, name, size })),
  );
  return { deleted, kept: asked.size - free.length };
}
