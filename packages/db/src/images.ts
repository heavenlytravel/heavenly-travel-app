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

/**
 * The size an image is best uploaded at, for each place one goes, as the
 * console's upload fields say it: its width and height in pixels, or a
 * width alone where any height does, and how the site fits it. "cover"
 * crops it to its frame, so another shape loses its edges; "contain"
 * shows all of it, so another shape shows smaller with space beside it.
 */
export type ImageSize = {
  width: number;
  /** None where any height does: a picture in a page's text. */
  height?: number;
  fit: "cover" | "contain";
  /** One line on the shape: "Landscape, the subject in the middle". */
  note: string;
};

export const IMAGE_SIZES = {
  /** A page's hero, across the top of the page, taller on a phone. */
  hero: {
    width: 1920,
    height: 1080,
    fit: "cover",
    note: "Landscape, the subject in the middle: a phone crops the sides.",
  },
  /** What a shared link shows, on WhatsApp, Facebook or X. */
  share: {
    width: 1200,
    height: 630,
    fit: "cover",
    note: "The shape link previews use.",
  },
  /** A vehicle class's picture, on its cards and in a booking. */
  classPicture: {
    width: 1500,
    height: 1000,
    fit: "cover",
    note: "Landscape 3:2, the whole vehicle in the middle: cards crop the edges to fill.",
  },
  /** A vehicle's photos, on its page and to the customer. */
  vehiclePhoto: {
    width: 1500,
    height: 1000,
    fit: "cover",
    note: "Landscape 3:2. The list crops other shapes; the full view shows all.",
  },
  /** A logo in the footer: a registration or a payment mark. */
  logo: {
    width: 480,
    height: 160,
    fit: "contain",
    note: "A PNG on a clear or white background, wider than tall.",
  },
  /** A picture in a page's text, as wide as the text. */
  inline: {
    width: 1600,
    fit: "contain",
    note: "Any height.",
  },
} as const satisfies Record<string, ImageSize>;

/** The recommended size as a line: "Best at 1920 × 1080 px or larger." */
export function imageSizeText(size: ImageSize): string {
  return size.height
    ? `Best at ${size.width} × ${size.height} px or larger.`
    : `Best at least ${size.width} px wide.`;
}

/**
 * What to say of an image uploaded against its recommended size, or null
 * when it suits: much smaller, so blurred on a large screen, or another
 * shape, cropped or shown smaller as the place fits it.
 */
export function imageSizeWarning(
  size: ImageSize,
  image: { width: number; height: number },
): string | null {
  if (image.width <= 0 || image.height <= 0) return null;
  const shape = image.width / image.height;
  const wanted = size.height ? size.width / size.height : null;
  if (wanted && Math.abs(shape - wanted) / wanted > 0.15) {
    const kind =
      image.height > image.width
        ? "portrait"
        : image.width === image.height
          ? "square"
          : shape > wanted
            ? "wider"
            : "taller";
    const what =
      kind === "portrait" || kind === "square"
        ? `It is ${kind}`
        : `It is ${kind} than ${size.width} × ${size.height}`;
    return size.fit === "cover"
      ? `${what}, so its edges are cut off.`
      : `${what}, so it shows smaller, with space beside it.`;
  }
  if (image.width < size.width * 0.6) {
    return `It is small, so it may look blurred on a large screen.`;
  }
  return null;
}

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
