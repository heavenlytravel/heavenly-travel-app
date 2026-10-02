import "server-only";
import {
  checkImageFile,
  type ImageType,
  type UploadedImage,
} from "@repo/db/server";
import { imageSize } from "image-size";
import { UTApi } from "uploadthing/server";

/**
 * Image uploads to UploadThing, for the location pages. The file goes
 * through this server: the browser never holds the token. What the file is
 * and how large it draws are read from its bytes, not from what the browser
 * says. See docs/261001-locations-and-pages.md, "Images".
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
    return refuse(
      503,
      "Image uploads are not set up: UPLOADTHING_TOKEN is missing.",
    );
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
