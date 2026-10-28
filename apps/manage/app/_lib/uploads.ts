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
import { FORBIDDEN_MESSAGE } from "@repo/console/action-state";

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
const UPLOADS_NOT_SET_UP =
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

/** What the Media screen says of a token it cannot read the app's id from. */
const TOKEN_UNREADABLE =
  "UPLOADTHING_TOKEN cannot be read. Copy it again from the app's API Keys page on UploadThing.";

/**
 * The app's id, read from the token: where its files are served,
 * https://<app id>.ufs.sh/f/<key>. Or why not: no token, or one that
 * cannot be read.
 */
function uploadAppId():
  { ok: true; appId: string } | { ok: false; error: string } {
  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) return { ok: false, error: UPLOADS_NOT_SET_UP };
  try {
    const { appId } = JSON.parse(
      Buffer.from(token, "base64").toString("utf8"),
    ) as { appId?: unknown };
    return typeof appId === "string" && appId !== ""
      ? { ok: true, appId }
      : { ok: false, error: TOKEN_UNREADABLE };
  } catch {
    return { ok: false, error: TOKEN_UNREADABLE };
  }
}

/** Every file stored, or why the list cannot be read. */
export type StoredFiles =
  { ok: true; files: StoredFile[] } | { ok: false; error: string };

/**
 * Every file stored, newest first, read a page at a time. A file being
 * deleted is left out.
 */
export async function listStoredFiles(): Promise<StoredFiles> {
  const app = uploadAppId();
  if (!app.ok) return app;
  const { appId } = app;
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
  return {
    ok: true,
    files: files.sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
    ),
  };
}

/**
 * Removes the files from storage for good. Answers whether every one
 * went; false when UploadThing refused or failed, or removed fewer.
 */
export async function deleteStoredFiles(
  keys: readonly string[],
): Promise<boolean> {
  if (keys.length === 0) return true;
  try {
    const { success, deletedCount } = await new UTApi().deleteFiles([...keys]);
    return success && deletedCount === keys.length;
  } catch (error) {
    console.error("UploadThing did not delete the files", error);
    return false;
  }
}
