import "server-only";
import {
  checkImageFile,
  type ImageType,
  type UploadedImage,
} from "@repo/db/server";
import { imageSize } from "image-size";
import { UTApi } from "uploadthing/server";

/**
 * Storing an image on UploadThing, for both apps' upload routes: the
 * admin's pictures and photos, and Connect's vehicle photos; and reading
 * one stored back, for the admin's "Choose from Media". The file
 * goes through the app's server: the browser never holds the token. What
 * the file is and how large it draws are read from its bytes, not from
 * what the browser says. Each database has its own UploadThing app. See
 * docs/261001-locations-and-pages.md, "Images".
 */

export type ImageUpload =
  | { ok: true; image: UploadedImage }
  | { ok: false; status: number; error: string };

/** The types the pages take, by the name `image-size` gives each. */
const TYPES: Record<string, ImageType> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** What uploads and the Media screen say when no UploadThing token is set. */
export const UPLOADS_NOT_SET_UP =
  "Image uploads are not set up: UPLOADTHING_TOKEN is missing.";

const refuse = (status: number, error: string): ImageUpload => ({
  ok: false,
  status,
  error,
});

/** The size the image draws at: a photo taken sideways is turned by its EXIF orientation. */
function drawnSize(bytes: Uint8Array) {
  try {
    const { width, height, type, orientation } = imageSize(bytes);
    const turned = orientation !== undefined && orientation >= 5;
    return {
      type: type ? TYPES[type] : undefined,
      width: turned ? height : width,
      height: turned ? width : height,
    };
  } catch {
    return null;
  }
}

/** Stores one image and answers its address, key and size. */
export async function uploadImage(file: File): Promise<ImageUpload> {
  const check = checkImageFile(file);
  if (!check.ok) return refuse(400, check.error);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = drawnSize(bytes);
  if (!size?.type || size.width < 1 || size.height < 1) {
    return refuse(400, "The file is not a JPEG, a PNG or a WebP image.");
  }

  if (!process.env.UPLOADTHING_TOKEN) {
    return refuse(503, UPLOADS_NOT_SET_UP);
  }
  const stored = await new UTApi().uploadFiles(
    new File([bytes], file.name, { type: size.type }),
  );
  if (stored.error) {
    console.error("UploadThing refused an image", stored.error);
    return refuse(502, "The image could not be stored. Try again.");
  }
  return {
    ok: true,
    image: {
      url: stored.data.ufsUrl,
      key: stored.data.key,
      width: size.width,
      height: size.height,
    },
  };
}

/**
 * A file already stored, answered as its upload was: its address and key,
 * and the size it draws at, read from its bytes. For an image field that
 * takes a file from Media instead of a second upload. Null when it cannot
 * be read, or is not a JPEG, a PNG or a WebP image.
 */
export async function storedImageOf(
  url: string,
  key: string,
): Promise<UploadedImage | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const size = drawnSize(new Uint8Array(await response.arrayBuffer()));
    if (!size?.type || size.width < 1 || size.height < 1) return null;
    return { url, key, width: size.width, height: size.height };
  } catch {
    return null;
  }
}

/**
 * The answer to an upload route once the app let the visitor in: the
 * image as the form field `file`, stored, answered as an `UploadedImage`,
 * or `{ error }` with the sentence the form shows.
 */
export async function answerUpload(request: Request): Promise<Response> {
  const file = await request
    .formData()
    .then((form) => form.get("file"))
    .catch(() => null);
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose an image." }, { status: 400 });
  }
  const result = await uploadImage(file);
  return result.ok
    ? Response.json(result.image)
    : Response.json({ error: result.error }, { status: result.status });
}
