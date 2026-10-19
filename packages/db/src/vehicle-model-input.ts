import type { Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
import { isUploadUrl } from "./images";

/**
 * What the catalogue edits of a model, "Toyota Alphard" in MPV VIP, and
 * the rules it checks, pure and browser-safe: the form shows the messages,
 * the writers in ./vehicle-models apply the same checks before they write.
 * See docs/261019-vehicles-and-drivers.md, "Models and their photos".
 */

export const MODEL_LIMITS = { name: 60, caption: 60, photos: 12 } as const;

/** One photo of a model, in its order. */
export type ModelPhoto = {
  /** A file on UploadThing. */
  url: string;
  /** "Interior"; empty for none. */
  caption: string;
};

export type VehicleModelFields = {
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** In order; the first is the model's cover. */
  photos: ModelPhoto[];
};

/** The form's field that carries the photos, as JSON. */
export const MODEL_PHOTOS_FIELD = "photos";

/** How the screen and the activity log name each field. */
export const VEHICLE_MODEL_FIELD_LABELS: Record<
  keyof VehicleModelFields,
  string
> = {
  name: "Name",
  sortOrder: "Sort order",
  isActive: "Shown to customers",
  photos: "Photos",
};

/** A photo's alt text: its caption, or the model's name for a photo with none. */
export function photoAlt(modelName: string, photo: { caption: string }) {
  return photo.caption ? `${modelName}, ${photo.caption}` : modelName;
}

/** "Toyota Vellfire or Toyota Alphard": the models a class card names. */
export function modelsLine(models: readonly { name: string }[]) {
  const names = models.map((model) => model.name);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

const fail = (error: string): Change => ({ ok: false, error });

/** The rules on a model's fields; a field left out is not checked. */
export function checkVehicleModelFields(
  fields: Partial<VehicleModelFields>,
): Change {
  if (fields.name !== undefined) {
    if (fields.name === "") return fail("Enter the model's name.");
    if (fields.name.length > MODEL_LIMITS.name) {
      return fail(`A name is at most ${MODEL_LIMITS.name} characters.`);
    }
  }
  if (fields.sortOrder !== undefined && !Number.isInteger(fields.sortOrder)) {
    return fail("The sort order is a whole number.");
  }
  if (fields.photos !== undefined) {
    if (fields.photos.length > MODEL_LIMITS.photos) {
      return fail(`A model has at most ${MODEL_LIMITS.photos} photos.`);
    }
    for (const photo of fields.photos) {
      if (!isUploadUrl(photo.url)) return fail("Upload the photo again.");
      if (photo.caption.length > MODEL_LIMITS.caption) {
        return fail(`A caption is at most ${MODEL_LIMITS.caption} characters.`);
      }
    }
  }
  return { ok: true };
}

/** The photos as the form posts them: a JSON list of `{ url, caption }`. */
function photosOf(value: unknown): ModelPhoto[] | null {
  let list: unknown;
  try {
    list = JSON.parse(textOf(value) || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(list)) return null;
  const photos: ModelPhoto[] = [];
  for (const item of list as unknown[]) {
    if (item === null || typeof item !== "object") return null;
    const { url, caption } = item as Record<string, unknown>;
    if (typeof url !== "string") return null;
    photos.push({ url, caption: textOf(caption) });
  }
  return photos;
}

/** The model form's values, read and checked. `isActive` is a checkbox. */
export function parseVehicleModelFields(
  values: Record<string, unknown>,
): Parsed<VehicleModelFields> {
  const photos = photosOf(values[MODEL_PHOTOS_FIELD]);
  if (!photos) return { ok: false, error: "Upload the photos again." };
  const fields: VehicleModelFields = {
    name: textOf(values.name),
    sortOrder: numberOf(values.sortOrder),
    isActive: flagOf(values.isActive),
    photos,
  };
  const check = checkVehicleModelFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
