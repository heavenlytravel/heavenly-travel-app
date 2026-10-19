import type { Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
import { isUploadUrl } from "./images";

/**
 * What the catalogue edits of a model, the Toyota Alphard in MPV VIP, and
 * the rules it checks, pure and browser-safe: the form shows the messages,
 * the writers in ./vehicle-models apply the same checks before they write.
 * A model is its brand and its name, "Toyota" and "Alphard", and the
 * screens show both. See docs/261019-vehicles-and-drivers.md, "Models and
 * their photos".
 */

export const MODEL_LIMITS = {
  brand: 40,
  name: 60,
  caption: 60,
  photos: 12,
} as const;

/** One photo of a model, in its order. */
export type ModelPhoto = {
  /** A file on UploadThing. */
  url: string;
  /** "Interior"; empty for none. */
  caption: string;
};

export type VehicleModelFields = {
  /** "Toyota". */
  brand: string;
  /** The model alone: "Alphard". */
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
  brand: "Brand",
  name: "Model",
  sortOrder: "Sort order",
  isActive: "Shown to customers",
  photos: "Photos",
};

/** "Toyota Alphard": a model as the screens name it. A model named before brands were kept is its name alone. */
export function modelName(model: { brand: string; name: string }) {
  return model.brand ? `${model.brand} ${model.name}` : model.name;
}

/** A brand or a model as it is kept: trimmed, one space between words. */
export function squashName(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Two brands, or two models, that are the same one typed differently: "toyota" and "Toyota". */
export function sameName(a: string, b: string) {
  return squashName(a).toLowerCase() === squashName(b).toLowerCase();
}

/** A photo's alt text: its caption, or the model's name for a photo with none. */
export function photoAlt(modelName: string, photo: { caption: string }) {
  return photo.caption ? `${modelName}, ${photo.caption}` : modelName;
}

/** "Toyota Vellfire or Toyota Alphard": the models a class card names, by their names. */
export function modelsLine(names: readonly string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

const fail = (error: string): Change => ({ ok: false, error });

/** The rules on a brand and a model's name, the vehicle form's as well as the catalogue's. */
export function checkModelName(fields: {
  brand?: string;
  name?: string;
}): Change {
  if (fields.brand !== undefined) {
    if (fields.brand === "") return fail("Enter the brand, such as Toyota.");
    if (fields.brand.length > MODEL_LIMITS.brand) {
      return fail(`A brand is at most ${MODEL_LIMITS.brand} characters.`);
    }
  }
  if (fields.name !== undefined) {
    if (fields.name === "") return fail("Enter the model, such as Alphard.");
    if (fields.name.length > MODEL_LIMITS.name) {
      return fail(`A model is at most ${MODEL_LIMITS.name} characters.`);
    }
  }
  return { ok: true };
}

/** The rules on a model's fields; a field left out is not checked. */
export function checkVehicleModelFields(
  fields: Partial<VehicleModelFields>,
): Change {
  const named = checkModelName(fields);
  if (!named.ok) return named;
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
    brand: squashName(textOf(values.brand)),
    name: squashName(textOf(values.name)),
    sortOrder: numberOf(values.sortOrder),
    isActive: flagOf(values.isActive),
    photos,
  };
  const check = checkVehicleModelFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
