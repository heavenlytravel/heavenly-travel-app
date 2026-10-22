import { refuse, type Change } from "./change";
import type { DeleteImpact } from "./delete-impact";
import { dayOf, documentsDue, parseDay, type DocumentDue } from "./expiry";
import { flagOf, textOf, type Parsed } from "./fields";
import {
  checkPhotos,
  parsePhotos,
  PHOTOS_FIELD,
  type Photo,
} from "./photos-input";
import { checkModelName, squashName } from "./vehicle-model-input";

/**
 * What the Vehicles tab edits of one of our vehicles and the rules it
 * checks, pure and browser-safe: the form shows the messages, the writers
 * in ./vehicles apply the same checks before they write. A vehicle names
 * its class, its brand and its model as typed; the writer finds the
 * catalogue's model or adds it. Its photos are a list of their own
 * (./photos-input), saved with the fields. The expiry dates are days,
 * "2027-03-12", as ./expiry handles them. See
 * docs/261019-vehicles-and-drivers.md, "Vehicles".
 */

export const VEHICLE_LIMITS = { colour: 40, notes: 500 } as const;

/** The oldest year a vehicle may be made in; the newest is next year's. */
const OLDEST_YEAR = 1980;

/** The documents a vehicle that carries paying passengers keeps valid, in the form's order. */
export const VEHICLE_DOCUMENTS = [
  "roadTaxExpiresOn",
  "insuranceExpiresOn",
  "inspectionExpiresOn",
  "permitExpiresOn",
] as const;
export type VehicleDocument = (typeof VEHICLE_DOCUMENTS)[number];

export const VEHICLE_DOCUMENT_LABELS: Record<VehicleDocument, string> = {
  roadTaxExpiresOn: "Road tax",
  insuranceExpiresOn: "Insurance",
  inspectionExpiresOn: "PUSPAKOM inspection",
  permitExpiresOn: "Operating permit",
};

/** Every editable field of a vehicle but its photos: what a change is compared by. */
export type VehicleFields = {
  /** In capitals without spaces: "VLE1234". */
  plate: string;
  vehicleClassId: string;
  /** "Toyota". */
  brand: string;
  /** The model alone: "Alphard". */
  model: string;
  locationId: string;
  colour: string;
  year: number | null;
  isActive: boolean;
  notes: string;
} & Record<VehicleDocument, string | null>;

export type VehicleField = keyof VehicleFields;

/** What the form saves: the fields, and the photos in order, the first the vehicle's cover. */
export type VehicleInput = VehicleFields & { photos: Photo[] };

/** How the screen and the activity log name each field. */
export const VEHICLE_FIELD_LABELS: Record<VehicleField | "photos", string> = {
  plate: "Plate",
  vehicleClassId: "Class",
  brand: "Brand",
  model: "Model",
  locationId: "Based at",
  colour: "Colour",
  year: "Year made",
  isActive: "In service",
  notes: "Notes",
  photos: "Photos",
  ...VEHICLE_DOCUMENT_LABELS,
};

/** A plate as it is kept: capitals, letters and digits only. "vle 1234" is "VLE1234". */
export function normalizePlate(text: string) {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const PLATE_RE = /^[A-Z0-9]{2,12}$/;

/** A stored vehicle's fields as the form and the log read them: its model by class, brand and name, its dates as days. */
export function vehicleFieldsOf(
  vehicle: {
    plate: string;
    vehicleModel: { vehicleClassId: string; brand: string; name: string };
    locationId: string;
    colour: string;
    year: number | null;
    isActive: boolean;
    notes: string;
  } & Record<VehicleDocument, Date | null>,
): VehicleFields {
  return {
    plate: vehicle.plate,
    vehicleClassId: vehicle.vehicleModel.vehicleClassId,
    brand: vehicle.vehicleModel.brand,
    model: vehicle.vehicleModel.name,
    locationId: vehicle.locationId,
    colour: vehicle.colour,
    year: vehicle.year,
    isActive: vehicle.isActive,
    notes: vehicle.notes,
    roadTaxExpiresOn: dayOf(vehicle.roadTaxExpiresOn),
    insuranceExpiresOn: dayOf(vehicle.insuranceExpiresOn),
    inspectionExpiresOn: dayOf(vehicle.inspectionExpiresOn),
    permitExpiresOn: dayOf(vehicle.permitExpiresOn),
  };
}

/** The vehicle's documents due within the warning or expired, soonest first. */
export function vehicleDocumentsDue(
  vehicle: Record<VehicleDocument, Date | null>,
  now: Date = new Date(),
): DocumentDue[] {
  const days = Object.fromEntries(
    VEHICLE_DOCUMENTS.map((key) => [key, dayOf(vehicle[key])]),
  ) as Record<VehicleDocument, string | null>;
  return documentsDue(days, VEHICLE_DOCUMENT_LABELS, now);
}

/** The rules on a vehicle's fields; a field left out is not checked. */
export function checkVehicleFields(
  fields: Partial<VehicleFields>,
  now: Date = new Date(),
): Change {
  if (fields.plate !== undefined && !PLATE_RE.test(fields.plate)) {
    return refuse(
      "Enter the plate: letters and digits, such as VLE 1234.",
      "plate",
    );
  }
  if (fields.vehicleClassId !== undefined && !fields.vehicleClassId) {
    return refuse("Choose the class.", "vehicleClassId");
  }
  const named = checkModelName({ brand: fields.brand, name: fields.model });
  if (!named.ok) return named;
  if (fields.locationId !== undefined && !fields.locationId) {
    return refuse("Choose where it is based.", "locationId");
  }
  if (fields.colour !== undefined) {
    if (fields.colour === "") return refuse("Enter the colour.", "colour");
    if (fields.colour.length > VEHICLE_LIMITS.colour) {
      return refuse(
        `A colour is at most ${VEHICLE_LIMITS.colour} characters.`,
        "colour",
      );
    }
  }
  if (fields.year !== undefined && fields.year !== null) {
    const newest = now.getUTCFullYear() + 1;
    if (
      !Number.isInteger(fields.year) ||
      fields.year < OLDEST_YEAR ||
      fields.year > newest
    ) {
      return refuse(
        `The year made is from ${OLDEST_YEAR} to ${newest}.`,
        "year",
      );
    }
  }
  if (
    fields.notes !== undefined &&
    fields.notes.length > VEHICLE_LIMITS.notes
  ) {
    return refuse(
      `Notes are at most ${VEHICLE_LIMITS.notes} characters.`,
      "notes",
    );
  }
  return { ok: true };
}

/**
 * The vehicle form's values, read and checked: its fields, and its photos,
 * which post as JSON under `PHOTOS_FIELD`. `isActive` is a checkbox; an
 * empty date is none.
 */
export function parseVehicleFields(
  values: Record<string, unknown>,
  now: Date = new Date(),
): Parsed<VehicleInput> {
  const photos = parsePhotos(values[PHOTOS_FIELD]);
  if (!photos) {
    return refuse("The photos did not arrive. Add them again.", PHOTOS_FIELD);
  }
  const photosCheck = checkPhotos(photos);
  if (!photosCheck.ok) return photosCheck;
  const yearText = textOf(values.year);
  const documents = {} as Record<VehicleDocument, string | null>;
  for (const key of VEHICLE_DOCUMENTS) {
    const day = parseDay(values[key], VEHICLE_DOCUMENT_LABELS[key], key);
    if (!day.ok) return day;
    documents[key] = day.value;
  }
  const fields: VehicleFields = {
    plate: normalizePlate(textOf(values.plate)),
    vehicleClassId: textOf(values.vehicleClassId),
    brand: squashName(textOf(values.brand)),
    model: squashName(textOf(values.model)),
    locationId: textOf(values.locationId),
    colour: textOf(values.colour),
    year: yearText === "" ? null : Number(yearText),
    isActive: flagOf(values.isActive),
    notes: textOf(values.notes),
    ...documents,
  };
  const check = checkVehicleFields(fields, now);
  return check.ok ? { ok: true, value: { ...fields, photos } } : check;
}

/** What deleting a vehicle changes beyond it, as `vehicleDeleteImpactOf` (./vehicles) reads it. */
export type VehicleDeleteFacts = {
  plate: string;
  /** How many photos it has. */
  photos: number;
  /** "Toyota Alphard", and whether the model leaves the catalogue with it: no other vehicle is of it and no booking chose it. */
  model: { name: string; leaves: boolean };
  /** The class and the location, as the customer site names them. */
  className: string;
  locationName: string;
  /**
   * Where customers there choose the model: whether it stops being
   * choosable, as its only vehicle in service there, and whether the class
   * then shows one model only, so no choice is offered at all.
   */
  choice: { lost: boolean; endsChoice: boolean } | null;
  /** What the class's picture there becomes when this vehicle supplied it; null when it did not. */
  cover: "photo" | "catalogue" | "none" | null;
};

/**
 * What deleting a vehicle takes (./delete-impact): its photos, its model
 * when nothing else is of it, and what customers at its location see of
 * its class: the model to choose and the class's picture. Those reach the
 * customer site, so the plate is typed to confirm.
 */
export function vehicleDeleteImpact(facts: VehicleDeleteFacts): DeleteImpact {
  const { model, className, locationName, choice, cover } = facts;
  const lines: string[] = [];
  if (facts.photos > 0) {
    lines.push(
      `${facts.photos === 1 ? "Its photo is" : `Its ${facts.photos} photos are`} taken off it; the files stay in Media until deleted there.`,
    );
  }
  if (model.leaves) {
    lines.push(
      `${model.name} leaves the catalogue: no other vehicle is of it and no booking chose it.`,
    );
  }
  if (choice?.lost) {
    lines.push(
      `Customers in ${locationName} can no longer choose the ${model.name} for ${className}: it is the model's only vehicle in service there.`,
    );
  }
  if (choice?.endsChoice) {
    lines.push(
      `${className} then shows one model in ${locationName}, so customers there no longer choose a model.`,
    );
  }
  if (cover === "photo") {
    lines.push(
      `${className}'s picture in ${locationName} changes to another vehicle's photo.`,
    );
  } else if (cover === "catalogue") {
    lines.push(
      `${className}'s picture in ${locationName} changes to the catalogue's picture.`,
    );
  } else if (cover === "none") {
    lines.push(
      `${className} has no picture in ${locationName} until a vehicle there has a photo.`,
    );
  }
  return {
    lines,
    confirmWith: choice?.lost || cover !== null ? facts.plate : null,
  };
}
