import type { Change } from "./change";
import { guardFor } from "./const-enum";

/**
 * Uploaded images, pure and browser-safe: the files the console takes and
 * the one host it stores them on. A location's pages keep theirs in their
 * content (./location-page-input); a vehicle class keeps the address of
 * its picture. The upload itself is the admin's, in apps/manage's
 * `_lib/uploads.ts`. See docs/261001-locations-and-pages.md, "Images".
 */

/** A file as the upload answers it. */
export type UploadedImage = {
  /** The file's address on UploadThing. */
  url: string;
  /** Its UploadThing key, for clearing unused files later. */
  key: string;
  width: number;
  height: number;
};

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const isImageType = guardFor(IMAGE_TYPES);

export const IMAGE_MAX_MB = 4;
export const IMAGE_MAX_BYTES = IMAGE_MAX_MB * 1024 * 1024;

/** A file is an image the console takes: a JPEG, a PNG or a WebP within the size limit. */
export function checkImageFile(file: { type: string; size: number }): Change {
  if (!isImageType(file.type)) {
    return { ok: false, error: "Upload a JPEG, a PNG or a WebP image." };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: `An image is at most ${IMAGE_MAX_MB} MB.` };
  }
  return { ok: true };
}

/** A size in bytes as people read it: "820 KB", "3.7 MB", "1.2 GB". */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (bytes === 0) return "0 KB";
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Where UploadThing serves a file: https://<app id>.ufs.sh/f/<key>. */
const UPLOAD_HOST_SUFFIX = ".ufs.sh";

/**
 * The UploadThing key of a file by its address, the part after /f/: how
 * a vehicle class's picture and a vehicle's photo, kept as addresses, are
 * matched to the stored files. Null for any other address.
 */
export function uploadKeyOf(url: string): string | null {
  if (!isUploadUrl(url)) return null;
  try {
    const key = decodeURIComponent(new URL(url).pathname.slice("/f/".length));
    return key === "" ? null : key;
  } catch {
    // A broken escape, "%zz": no file of ours is named so.
    return null;
  }
}

/** Whether the address is a file on UploadThing, the one host the sites load images from. */
export function isUploadUrl(value: unknown): value is string {
  if (typeof value !== "string" || !URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    url.hostname.endsWith(UPLOAD_HOST_SUFFIX) &&
    url.pathname.startsWith("/f/")
  );
}
