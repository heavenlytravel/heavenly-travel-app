import { isTripCategory, type TripCategory } from "./booking-status";
import { refuse, type Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
import { isUploadUrl } from "./images";
import { PHOTO_LIMITS } from "./photos-input";
import { slugify } from "./slug";
import { squashName } from "./vehicle-model-input";

/**
 * What the Vehicle classes screen edits of a catalogue class and the rules
 * it checks, pure and browser-safe: the form displays the messages, the
 * writers in ./vehicle-classes apply the same checks before they write.
 * The rates and rules a location sells a class under are ./offering-input.
 * See docs/261015-locations-as-operation-areas.md, "Vehicle Classes",
 * docs/261018-location-work-and-class-catalogue.md and
 * docs/261111-catalogue-booking-flow-and-ops.md, part A.
 */

/**
 * What the class form edits: the class's type and tier by name, as typed
 * or chosen (`tier` empty for none), and its own columns. Its name and
 * slug are made from the type and the tier (`classNameOf`); its place in
 * the list is moved with arrows.
 */
export type VehicleClassFields = {
  type: string;
  tier: string;
  description: string;
  category: TripCategory;
  minPassengers: number;
  maxPassengers: number;
  luggage: string;
  /** Its pictures on UploadThing, in order, the first its cover; empty for none. */
  imageUrls: string[];
  isActive: boolean;
};

export type VehicleClassField = keyof VehicleClassFields;

/** How the screen and the activity log name each field. */
export const VEHICLE_CLASS_FIELD_LABELS: Record<VehicleClassField, string> = {
  type: "Type",
  tier: "Tier",
  description: "Description",
  category: "Category",
  minPassengers: "Seats From",
  maxPassengers: "Seats To",
  luggage: "Luggage",
  imageUrls: "Pictures",
  isActive: "Active",
};

/** The longest a type or a tier may be. */
export const CLASS_KIND_LIMIT = 40;

/**
 * A class's name from its tier and type, tier first: "Deluxe - Sedan";
 * the type alone without a tier: "Truck".
 */
export function classNameOf(kind: { type: string; tier: string }) {
  const type = squashName(kind.type);
  const tier = squashName(kind.tier);
  return tier ? `${tier} - ${type}` : type;
}

/** A class's slug from its tier and type: "deluxe-sedan". */
export function classSlugOf(kind: { type: string; tier: string }) {
  return slugify(classNameOf(kind));
}

/** How many a class seats, as a customer reads it: "Up to 6 passengers". */
export function seatsLabel(vehicleClass: {
  minPassengers: number;
  maxPassengers: number;
}) {
  const { minPassengers, maxPassengers } = vehicleClass;
  return minPassengers === 1
    ? `Up to ${maxPassengers} passengers`
    : `${minPassengers} to ${maxPassengers} passengers`;
}

const TEXT_FIELDS = ["type", "description", "luggage"] as const;

const isWhole = (n: number) => Number.isInteger(n);

const lowerLabel = (key: VehicleClassField) =>
  VEHICLE_CLASS_FIELD_LABELS[key].toLowerCase();

/** The rules on a class's fields; a field left out is not checked. */
export function checkVehicleClassFields(
  fields: Partial<VehicleClassFields>,
): Change {
  for (const key of TEXT_FIELDS) {
    const value = fields[key];
    if (value !== undefined && value.trim() === "") {
      return refuse(`Enter the ${lowerLabel(key)}.`, key);
    }
  }
  for (const key of ["type", "tier"] as const) {
    const value = fields[key];
    if (value !== undefined && squashName(value).length > CLASS_KIND_LIMIT) {
      return refuse(
        `A ${lowerLabel(key)} is at most ${CLASS_KIND_LIMIT} characters.`,
        key,
      );
    }
  }
  if (fields.type !== undefined && !slugify(fields.type)) {
    return refuse("Enter a type with a letter or digit.", "type");
  }
  if (fields.category !== undefined && !isTripCategory(fields.category)) {
    return refuse("Choose a category.", "category");
  }
  for (const key of ["minPassengers", "maxPassengers"] as const) {
    const value = fields[key];
    if (value !== undefined && (!isWhole(value) || value < 1)) {
      return refuse("Seats are whole numbers from 1.", key);
    }
  }
  if (
    fields.minPassengers !== undefined &&
    fields.maxPassengers !== undefined &&
    fields.maxPassengers < fields.minPassengers
  ) {
    return refuse(
      "Seats to is at least seats from. Raise it, or lower seats from.",
      "maxPassengers",
    );
  }
  if (fields.imageUrls !== undefined) {
    if (fields.imageUrls.length > PHOTO_LIMITS.photos) {
      return refuse(
        `A class has at most ${PHOTO_LIMITS.photos} pictures. Remove some.`,
        "imageUrls",
      );
    }
    if (!fields.imageUrls.every(isUploadUrl)) {
      return refuse(
        "A picture did not finish uploading. Remove it and add it again.",
        "imageUrls",
      );
    }
  }
  return { ok: true };
}

/** A JSON list of addresses as a form posts it; a value that is not one reads as an address nobody uploaded, which the check refuses. */
function urlsOf(value: unknown): string[] {
  try {
    const list: unknown = JSON.parse(textOf(value) || "[]");
    if (Array.isArray(list)) {
      return list.map((url) => (typeof url === "string" ? url : ""));
    }
  } catch {
    // Read below as one bad address.
  }
  return [""];
}

/**
 * The class form's values, read and checked. `isActive` is a checkbox;
 * `imageUrls` is a JSON list of the addresses the uploads answered, in
 * order, empty for no picture.
 */
export function parseVehicleClassFields(
  values: Record<string, unknown>,
): Parsed<VehicleClassFields> {
  const category = textOf(values.category);
  if (!isTripCategory(category)) {
    return refuse("Choose a category.", "category");
  }

  const fields: VehicleClassFields = {
    type: squashName(textOf(values.type)),
    tier: squashName(textOf(values.tier)),
    description: textOf(values.description),
    category,
    minPassengers: numberOf(values.minPassengers),
    maxPassengers: numberOf(values.maxPassengers),
    luggage: textOf(values.luggage),
    imageUrls: urlsOf(values.imageUrls),
    isActive: flagOf(values.isActive),
  };
  const check = checkVehicleClassFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
