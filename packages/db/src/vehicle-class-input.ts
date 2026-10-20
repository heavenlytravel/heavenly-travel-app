import { isTripCategory, type TripCategory } from "./booking-status";
import { refuse, type Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
import { isUploadUrl } from "./images";

/**
 * What the Vehicle classes screen edits of a catalogue class and the rules
 * it checks, pure and browser-safe: the form displays the messages, the
 * writers in ./vehicle-classes apply the same checks before they write.
 * The rates and rules a location sells a class under are ./offering-input.
 * See docs/261015-locations-as-operation-areas.md, "Vehicle classes", and
 * docs/261018-location-work-and-class-catalogue.md.
 */

/** Every editable column of `VehicleClass`. */
export type VehicleClassFields = {
  name: string;
  description: string;
  category: TripCategory;
  sortOrder: number;
  minPassengers: number;
  maxPassengers: number;
  luggage: string;
  /** Its picture on UploadThing; null for none. */
  imageUrl: string | null;
  isActive: boolean;
};

export type VehicleClassField = keyof VehicleClassFields;

/** How the screen and the activity log name each field. */
export const VEHICLE_CLASS_FIELD_LABELS: Record<VehicleClassField, string> = {
  name: "Name",
  description: "Description",
  category: "Category",
  sortOrder: "Sort order",
  minPassengers: "Seats from",
  maxPassengers: "Seats to",
  luggage: "Luggage",
  imageUrl: "Picture",
  isActive: "Active",
};

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

const TEXT_FIELDS = ["name", "description", "luggage"] as const;

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
  if (fields.category !== undefined && !isTripCategory(fields.category)) {
    return refuse("Choose a category.", "category");
  }
  if (fields.sortOrder !== undefined && !isWhole(fields.sortOrder)) {
    return refuse("The sort order is a whole number.", "sortOrder");
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
  if (
    fields.imageUrl !== undefined &&
    fields.imageUrl !== null &&
    !isUploadUrl(fields.imageUrl)
  ) {
    return refuse(
      "The picture did not finish uploading. Upload it again.",
      "imageUrl",
    );
  }
  return { ok: true };
}

/**
 * The class form's values, read and checked. `isActive` is a checkbox;
 * `imageUrl` is the address the upload answered, empty for no picture.
 */
export function parseVehicleClassFields(
  values: Record<string, unknown>,
): Parsed<VehicleClassFields> {
  const category = textOf(values.category);
  if (!isTripCategory(category)) {
    return refuse("Choose a category.", "category");
  }

  const fields: VehicleClassFields = {
    name: textOf(values.name),
    description: textOf(values.description),
    category,
    sortOrder: numberOf(values.sortOrder),
    minPassengers: numberOf(values.minPassengers),
    maxPassengers: numberOf(values.maxPassengers),
    luggage: textOf(values.luggage),
    imageUrl: textOf(values.imageUrl) || null,
    isActive: flagOf(values.isActive),
  };
  const check = checkVehicleClassFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
