import { refuse, type Change } from "./change";
import type { DeleteImpact } from "./delete-impact";
import { dayOf, documentsDue, parseDay, type DocumentDue } from "./expiry";
import { flagOf, textOf, type Parsed } from "./fields";
import { isValidEmail, normalizeEmail } from "./booking-contact";
import { isValidPhone, normalizePhone } from "./phone";

/**
 * What the Drivers tab edits of one of our drivers and the rules it
 * checks, pure and browser-safe: the form shows the messages, the writers
 * in ./drivers apply the same checks before they write. The expiry dates
 * are days, as ./expiry handles them. See
 * docs/261019-vehicles-and-drivers.md, "Drivers".
 */

export const DRIVER_LIMITS = { name: 80, notes: 500 } as const;

/** The licences a driver keeps valid, in the form's order. */
export const DRIVER_DOCUMENTS = ["licenceExpiresOn", "psvExpiresOn"] as const;
export type DriverDocument = (typeof DRIVER_DOCUMENTS)[number];

export const DRIVER_DOCUMENT_LABELS: Record<DriverDocument, string> = {
  licenceExpiresOn: "Driving licence",
  psvExpiresOn: "PSV licence",
};

/** The form's field that carries each class the driver may drive; one value per class. */
export const DRIVER_CLASSES_FIELD = "vehicleClassIds";

/** Every editable field of a driver. */
export type DriverFields = {
  /** Whose driver they are. */
  vendorId: string;
  name: string;
  /** As ./phone keeps it. */
  phone: string;
  /** Lowercase: what links their account to open Connect; null until known. */
  email: string | null;
  locationId: string;
  /** The classes they may drive, each once, sorted. */
  vehicleClassIds: string[];
  isActive: boolean;
  notes: string;
} & Record<DriverDocument, string | null>;

export type DriverField = keyof DriverFields;

/** How the screen and the activity log name each field. */
export const DRIVER_FIELD_LABELS: Record<DriverField, string> = {
  vendorId: "Vendor",
  name: "Name",
  phone: "Phone",
  email: "Email",
  locationId: "Based at",
  vehicleClassIds: "May drive",
  isActive: "Active",
  notes: "Notes",
  ...DRIVER_DOCUMENT_LABELS,
};

/** A stored driver's fields as the form and the log read them: its dates as days, its classes by id. */
export function driverFieldsOf(
  driver: {
    vendorId: string;
    name: string;
    phone: string;
    email: string | null;
    locationId: string;
    vehicleClasses: readonly { id: string }[];
    isActive: boolean;
    notes: string;
  } & Record<DriverDocument, Date | null>,
): DriverFields {
  return {
    vendorId: driver.vendorId,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    locationId: driver.locationId,
    vehicleClassIds: driver.vehicleClasses.map((c) => c.id).sort(),
    isActive: driver.isActive,
    notes: driver.notes,
    licenceExpiresOn: dayOf(driver.licenceExpiresOn),
    psvExpiresOn: dayOf(driver.psvExpiresOn),
  };
}

/** The driver's licences due within the warning or expired, soonest first. */
export function driverDocumentsDue(
  driver: Record<DriverDocument, Date | null>,
  now: Date = new Date(),
): DocumentDue[] {
  const days = Object.fromEntries(
    DRIVER_DOCUMENTS.map((key) => [key, dayOf(driver[key])]),
  ) as Record<DriverDocument, string | null>;
  return documentsDue(days, DRIVER_DOCUMENT_LABELS, now);
}

/** The rules on a driver's fields; a field left out is not checked. */
export function checkDriverFields(fields: Partial<DriverFields>): Change {
  if (fields.vendorId !== undefined && !fields.vendorId) {
    return refuse("Choose whose driver they are.", "vendorId");
  }
  if (fields.name !== undefined) {
    if (fields.name === "") return refuse("Enter the driver's name.", "name");
    if (fields.name.length > DRIVER_LIMITS.name) {
      return refuse(
        `A name is at most ${DRIVER_LIMITS.name} characters.`,
        "name",
      );
    }
  }
  if (fields.phone !== undefined && !isValidPhone(fields.phone)) {
    return refuse("Enter a phone number the team can call.", "phone");
  }
  if (
    fields.email !== undefined &&
    fields.email !== null &&
    !isValidEmail(fields.email)
  ) {
    return refuse(
      "Enter the email they sign in with, such as ali@example.com, or leave it empty.",
      "email",
    );
  }
  if (fields.locationId !== undefined && !fields.locationId) {
    return refuse("Choose where they are based.", "locationId");
  }
  if (
    fields.vehicleClassIds !== undefined &&
    fields.vehicleClassIds.length === 0
  ) {
    return refuse(
      "Tick at least one class they may drive.",
      DRIVER_CLASSES_FIELD,
    );
  }
  if (fields.notes !== undefined && fields.notes.length > DRIVER_LIMITS.notes) {
    return refuse(
      `Notes are at most ${DRIVER_LIMITS.notes} characters.`,
      "notes",
    );
  }
  return { ok: true };
}

/**
 * The driver form's values, read and checked. The classes come as one
 * value each under `DRIVER_CLASSES_FIELD`; `isActive` is a checkbox; an
 * empty date is none.
 */
export function parseDriverFields(
  values: Record<string, unknown>,
  vehicleClassIds: readonly unknown[],
): Parsed<DriverFields> {
  const documents = {} as Record<DriverDocument, string | null>;
  for (const key of DRIVER_DOCUMENTS) {
    const day = parseDay(values[key], DRIVER_DOCUMENT_LABELS[key], key);
    if (!day.ok) return day;
    documents[key] = day.value;
  }
  const email = normalizeEmail(textOf(values.email));
  const fields: DriverFields = {
    vendorId: textOf(values.vendorId),
    name: textOf(values.name),
    phone: normalizePhone(textOf(values.phone)),
    email: email === "" ? null : email,
    locationId: textOf(values.locationId),
    vehicleClassIds: [
      ...new Set(vehicleClassIds.map(textOf).filter(Boolean)),
    ].sort(),
    isActive: flagOf(values.isActive),
    notes: textOf(values.notes),
    ...documents,
  };
  const check = checkDriverFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}

/**
 * What deleting a driver takes (./delete-impact): nothing beyond them,
 * since one who has been on a job cannot be deleted, so a plain yes
 * confirms it.
 */
export const DRIVER_DELETE_IMPACT: DeleteImpact = {
  lines: ["Nothing else changes: they have not been on a job."],
  confirmWith: null,
};
