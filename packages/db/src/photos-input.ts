import type { Change } from "./change";
import { textOf } from "./fields";
import { isUploadUrl } from "./images";

/**
 * A list of photos as a form edits it and the rules it checks, pure and
 * browser-safe: the vehicle form's photos, each a file on UploadThing with
 * an optional caption, in order, the first the cover. The form posts the
 * list as JSON in one field. See docs/261019-vehicles-and-drivers.md,
 * "Photos".
 */

export const PHOTO_LIMITS = { caption: 60, photos: 12 } as const;

/** One photo in a list, in its order. */
export type Photo = {
  /** A file on UploadThing. */
  url: string;
  /** "Interior"; empty for none. */
  caption: string;
};

/** The form field that carries the photos, as JSON. */
export const PHOTOS_FIELD = "photos";

/** A photo's alt text: its caption beside the name of what it shows, or the name alone. */
export function photoAlt(name: string, photo: { caption: string }) {
  return photo.caption ? `${name}, ${photo.caption}` : name;
}

/** The rules on a list of photos: at most 12, each stored on UploadThing, each caption short. */
export function checkPhotos(photos: readonly Photo[]): Change {
  if (photos.length > PHOTO_LIMITS.photos) {
    return {
      ok: false,
      error: `A vehicle has at most ${PHOTO_LIMITS.photos} photos.`,
    };
  }
  for (const photo of photos) {
    if (!isUploadUrl(photo.url)) {
      return { ok: false, error: "Upload the photo again." };
    }
    if (photo.caption.length > PHOTO_LIMITS.caption) {
      return {
        ok: false,
        error: `A caption is at most ${PHOTO_LIMITS.caption} characters.`,
      };
    }
  }
  return { ok: true };
}

/** The photos as a form posts them, a JSON list of `{ url, caption }`, read but not checked; null when it is not one. */
export function parsePhotos(value: unknown): Photo[] | null {
  let list: unknown;
  try {
    list = JSON.parse(textOf(value) || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;
  const photos: Photo[] = [];
  for (const item of list as unknown[]) {
    if (item === null || typeof item !== "object") return null;
    const { url, caption } = item as Record<string, unknown>;
    if (typeof url !== "string") return null;
    photos.push({ url, caption: textOf(caption) });
  }
  return photos;
}

/** Two lists hold the same files, captions and order. */
export function samePhotos(a: readonly Photo[], b: readonly Photo[]) {
  return (
    a.length === b.length &&
    a.every(
      (photo, i) => photo.url === b[i]!.url && photo.caption === b[i]!.caption,
    )
  );
}
