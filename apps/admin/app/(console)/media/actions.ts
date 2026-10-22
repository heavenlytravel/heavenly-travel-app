"use server";

import {
  deleteConfirmationOf,
  logMediaDeleted,
  releaseMedia,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  FORBIDDEN,
  STALE,
  refusalOf,
  type ActionState,
} from "../../_lib/action-state";
import { revalidateFleet } from "../../_lib/fleet-actions";
import {
  UPLOADS_NOT_SET_UP,
  deleteStoredFiles,
  listStoredFiles,
} from "../../_lib/uploads";

/** The most files one delete takes: more than a page of the screen holds. */
const MAX_KEYS = 500;

/**
 * Deletes the chosen files for good, by their keys. `seen` and `typed`
 * are what the dialog showed and what the admin typed (@repo/db's
 * delete-impact): the database takes them off the vehicles and classes
 * that use them first (`releaseMedia`), and refuses one on a page or a
 * delete that takes more than was shown; then they go from UploadThing,
 * and what went is logged. The customer site's classes and models
 * refresh when a photo or a picture went. SUPER only.
 */
export async function deleteMediaAction(
  keys: string[],
  seen: string[],
  typed: string | null,
): Promise<ActionState> {
  const admin = await getAdmin("media.manage");
  if (!admin) return FORBIDDEN;
  const confirmation = deleteConfirmationOf(seen, typed);
  if (
    !confirmation ||
    !Array.isArray(keys) ||
    keys.length === 0 ||
    keys.length > MAX_KEYS ||
    !keys.every((key) => typeof key === "string" && key !== "")
  ) {
    return STALE;
  }

  const files = await listStoredFiles();
  if (!files) return { error: UPLOADS_NOT_SET_UP };
  const asked = new Set(keys);
  // One gone meanwhile leaves the impact short of what was shown.
  const chosen = files.filter((file) => asked.has(file.key));
  const released = await releaseMedia(actorOf(admin), chosen, confirmation);
  if (!released.ok) return refusalOf(released);

  await deleteStoredFiles(chosen.map((file) => file.key));
  await logMediaDeleted(
    actorOf(admin),
    chosen.map(({ key, name, size }) => ({ key, name, size })),
  );
  if (released.vehicleLocationIds.length > 0 || released.classPictures > 0) {
    revalidateFleet("vehicles");
  }
  return null;
}
