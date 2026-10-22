import "server-only";
import {
  checkImageFile,
  type ImageType,
  type Permission,
  type UploadedImage,
} from "@repo/db/server";
import { imageSize } from "image-size";
import { UTApi } from "uploadthing/server";
import { getAdmin } from "./access";
import { FORBIDDEN_MESSAGE } from "./action-state";

/**
 * Image uploads to UploadThing, for the location pages, the vehicle
 * classes' pictures and the vehicles' photos, and the Media screen's list
 * and delete of the stored files. The file goes through this server: the
 * browser never holds the token. What the file is and how large it draws
 * are read from its bytes, not from what the browser says. Each database
 * has its own UploadThing app, so the files listed are this database's.
 * See docs/261001-locations-and-pages.md, "Images".
 */

type ImageUpload =
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
async function uploadImage(file: File): Promise<ImageUpload> {
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
 * The answer to an upload route: the image as the form field `file`, from
 * an admin with `permission`. Answers the stored file as an
 * `UploadedImage`, or `{ error }` with the sentence the form shows.
 */
export async function answerImageUpload(
  request: Request,
  permission: Permission,
): Promise<Response> {
  const admin = await getAdmin(permission);
  if (!admin) {
    return Response.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
  }

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

/** A file as UploadThing keeps it, for the Media screen. */
export type StoredFile = {
  key: string;
  name: string;
  /** In bytes. */
  size: number;
  uploadedAt: Date;
  /** Where the file is served. */
  url: string;
};

/** How many files UploadThing lists at a time. */
const LIST_PAGE = 500;

/**
 * The app's id, read from the token: where its files are served,
 * https://<app id>.ufs.sh/f/<key>. Null without a token, or with one that
 * cannot be read.
 */
function uploadAppId(): string | null {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) return null;
  try {
    const { appId } = JSON.parse(
      Buffer.from(token, "base64").toString("utf8"),
    ) as { appId?: unknown };
    return typeof appId === "string" && appId !== "" ? appId : null;
  } catch {
    return null;
  }
}

/**
 * Every file stored, newest first, read a page at a time; null when
 * uploads are not set up. A file being deleted is left out.
 */
export async function listStoredFiles(): Promise<StoredFile[] | null> {
  const appId = uploadAppId();
  if (!appId) return null;
  const api = new UTApi();
  const files: StoredFile[] = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const page = await api.listFiles({ limit: LIST_PAGE, offset });
    for (const file of page.files) {
      if (file.status === "Deletion Pending") continue;
      files.push({
        key: file.key,
        name: file.name,
        size: file.size,
        uploadedAt: new Date(file.uploadedAt),
        url: `https://${appId}.ufs.sh/f/${encodeURIComponent(file.key)}`,
      });
    }
    if (!page.hasMore || page.files.length === 0) break;
  }
  return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

/** Removes the files from storage for good; answers how many went. */
export async function deleteStoredFiles(
  keys: readonly string[],
): Promise<number> {
  if (keys.length === 0) return 0;
  const { deletedCount } = await new UTApi().deleteFiles([...keys]);
  return deletedCount;
}
