"use server";

import {
  andList,
  mediaReachOf,
  type MediaReach,
  type UploadedImage,
} from "@repo/db";
import { FORBIDDEN_MESSAGE, STALE_MESSAGE } from "@repo/console/action-state";
import { storedImageOf } from "@repo/console/image-upload";
import { getPermissions } from "./access";
import { listMediaFiles } from "./media";

/**
 * "Choose from Media" in the console's image fields (BL-84): the stored
 * files the admin may see, listed when the picker opens, and the ones
 * picked, answered as an upload would answer them, so one picture serves
 * several places without a second upload. Connect has no picker: a
 * vendor never sees the staff's files.
 */

/** One file the picker offers. */
export type MediaChoice = {
  key: string;
  name: string;
  url: string;
  /** In bytes. */
  size: number;
};

/** The most files one pick takes: a vehicle's photos at most. */
const MAX_PICK = 20;

/** Whether the keys reach any file: an admin who works with no image has no picker to fill. */
const reachesAny = (reach: MediaReach) =>
  reach.pages || reach.fleet || reach.unused;

/** The files the signed-in admin sees (`listMediaFiles`), newest first, or why not. */
export async function listMediaChoicesAction(): Promise<
  { ok: true; files: MediaChoice[] } | { ok: false; error: string }
> {
  const permissions = await getPermissions();
  if (!reachesAny(mediaReachOf(permissions))) {
    return { ok: false, error: FORBIDDEN_MESSAGE };
  }
  const listed = await listMediaFiles(permissions);
  if (!listed.ok) return listed;
  return {
    ok: true,
    files: listed.files.map(({ file }) => ({
      key: file.key,
      name: file.name,
      url: file.url,
      size: file.size,
    })),
  };
}

/**
 * The files picked, by their keys, as `UploadedImage`s in the order
 * picked: each still stored and still the admin's to see, its size read
 * from its bytes as an upload's is. Or why not, for under the picker.
 */
export async function chooseMediaAction(
  keys: string[],
): Promise<
  { ok: true; images: UploadedImage[] } | { ok: false; error: string }
> {
  if (
    !Array.isArray(keys) ||
    keys.length === 0 ||
    keys.length > MAX_PICK ||
    !keys.every((key) => typeof key === "string" && key !== "")
  ) {
    return { ok: false, error: STALE_MESSAGE };
  }
  const permissions = await getPermissions();
  if (!reachesAny(mediaReachOf(permissions))) {
    return { ok: false, error: FORBIDDEN_MESSAGE };
  }
  const listed = await listMediaFiles(permissions);
  if (!listed.ok) return listed;
  const byKey = new Map(listed.files.map(({ file }) => [file.key, file]));
  const files = keys.flatMap((key) => {
    const file = byKey.get(key);
    return file ? [file] : [];
  });
  if (files.length < keys.length) {
    return {
      ok: false,
      error:
        "An image chosen is no longer in Media. Close this and choose again.",
    };
  }
  const read = await Promise.all(
    files.map((file) => storedImageOf(file.url, file.key)),
  );
  const images = read.filter((image) => image !== null);
  if (images.length < files.length) {
    const unread = files.filter((_, i) => !read[i]).map((file) => file.name);
    return {
      ok: false,
      error: `${andList(unread)} could not be read from storage. Try again, or upload ${unread.length === 1 ? "it" : "them"}.`,
    };
  }
  return { ok: true, images };
}
