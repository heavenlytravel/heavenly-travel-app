import { isValidEmail, normalizeEmail } from "./booking-contact";
import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import { textOf, type Parsed } from "./fields";
import { isValidPhone, normalizePhone } from "./phone";

/**
 * A vendor's vocabulary and the rules on what the admin's vendor form and
 * Connect's registration form edit, pure and browser-safe: the forms show
 * the messages, the writers in ./vendors apply the same checks before they
 * write. See docs/261028-fulfilment-vendors-and-connect.md, "Vendors" and
 * "Signing up".
 */

export const VENDOR_KINDS = ["company", "individual"] as const;
export type VendorKind = (typeof VENDOR_KINDS)[number];
export const isVendorKind = guardFor(VENDOR_KINDS);
export const VENDOR_KIND_LABELS: Record<VendorKind, string> = {
  company: "Company",
  individual: "Individual",
};

/** pending -> active, or refused; active <-> suspended. */
export const VENDOR_STATUSES = [
  "pending",
  "active",
  "refused",
  "suspended",
] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];
export const isVendorStatus = guardFor(VENDOR_STATUSES);
export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  pending: "Waiting for approval",
  active: "Active",
  refused: "Not approved",
  suspended: "Suspended",
};

/**
 * What a vendor may supply, asked of every kind at sign-up. Only transport
 * is worked in Connect for now; the rest is a supplier list for
 * Reservation.
 */
export const VENDOR_SERVICES = [
  "car-with-driver",
  "coach-charter",
  "driver",
  "self-drive",
  "accommodation",
  "attraction",
] as const;
export type VendorService = (typeof VENDOR_SERVICES)[number];
export const isVendorService = guardFor(VENDOR_SERVICES);
export const VENDOR_SERVICE_LABELS: Record<VendorService, string> = {
  "car-with-driver": "Car with driver",
  "coach-charter": "Coach charter",
  driver: "Driver only",
  "self-drive": "Self-drive rental",
  accommodation: "Accommodation",
  attraction: "Attraction",
};

/** The form's field that carries each service; one value per service. */
export const VENDOR_SERVICES_FIELD = "services";
/** The form's field that carries each location served; one value per location. */
export const VENDOR_LOCATIONS_FIELD = "locationIds";

/** The owner signed up for it; staff are added by the owner. */
export const VENDOR_ROLES = ["owner", "staff"] as const;
export type VendorRole = (typeof VENDOR_ROLES)[number];
export const isVendorRole = guardFor(VENDOR_ROLES);
export const VENDOR_ROLE_LABELS: Record<VendorRole, string> = {
  owner: "Owner",
  staff: "Staff",
};

export const VENDOR_LIMITS = {
  name: 120,
  registrationNo: 40,
  contactName: 80,
  address: 300,
  reviewNote: 500,
} as const;

/** Every field of a vendor its forms edit. */
export type VendorFields = {
  name: string;
  kind: VendorKind;
  /** The SSM number, or an individual's IC. */
  registrationNo: string;
  contactName: string;
  /** As ./phone keeps it. */
  contactPhone: string;
  /** Lowercase. */
  contactEmail: string;
  address: string;
  /** What it supplies, each once, in `VENDOR_SERVICES` order. */
  services: VendorService[];
  /** The locations it serves, each once, sorted. */
  locationIds: string[];
};

export type VendorField = keyof VendorFields;

/** How the screens and the activity log name each field. */
export const VENDOR_FIELD_LABELS: Record<VendorField, string> = {
  name: "Name",
  kind: "Company or individual",
  registrationNo: "SSM or IC number",
  contactName: "Contact person",
  contactPhone: "Contact phone",
  contactEmail: "Contact email",
  address: "Address",
  services: "What it offers",
  locationIds: "Locations served",
};

/** The services among the values, once each, in `VENDOR_SERVICES` order. */
export function vendorServicesOf(values: readonly unknown[]): VendorService[] {
  return VENDOR_SERVICES.filter((service) => values.includes(service));
}

/** A stored vendor's fields as the forms and the log read them. */
export function vendorFieldsOf(vendor: {
  name: string;
  kind: string;
  registrationNo: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  services: readonly string[];
  locations: readonly { id: string }[];
}): VendorFields {
  return {
    name: vendor.name,
    kind: isVendorKind(vendor.kind) ? vendor.kind : "company",
    registrationNo: vendor.registrationNo,
    contactName: vendor.contactName,
    contactPhone: vendor.contactPhone,
    contactEmail: vendor.contactEmail,
    address: vendor.address,
    services: vendorServicesOf(vendor.services),
    locationIds: vendor.locations.map((l) => l.id).sort(),
  };
}

/** The rules on a vendor's fields; a field left out is not checked. */
export function checkVendorFields(fields: Partial<VendorFields>): Change {
  if (fields.name !== undefined) {
    if (fields.name === "") return refuse("Enter the vendor's name.", "name");
    if (fields.name.length > VENDOR_LIMITS.name) {
      return refuse(
        `A name is at most ${VENDOR_LIMITS.name} characters.`,
        "name",
      );
    }
  }
  if (fields.kind !== undefined && !isVendorKind(fields.kind)) {
    return refuse("Choose company or individual.", "kind");
  }
  if (
    fields.registrationNo !== undefined &&
    fields.registrationNo.length > VENDOR_LIMITS.registrationNo
  ) {
    return refuse(
      `The number is at most ${VENDOR_LIMITS.registrationNo} characters.`,
      "registrationNo",
    );
  }
  if (fields.contactName !== undefined) {
    if (fields.contactName === "") {
      return refuse("Enter who the team speaks to.", "contactName");
    }
    if (fields.contactName.length > VENDOR_LIMITS.contactName) {
      return refuse(
        `A name is at most ${VENDOR_LIMITS.contactName} characters.`,
        "contactName",
      );
    }
  }
  if (fields.contactPhone !== undefined && !isValidPhone(fields.contactPhone)) {
    return refuse("Enter a phone number the team can call.", "contactPhone");
  }
  if (fields.contactEmail !== undefined && !isValidEmail(fields.contactEmail)) {
    return refuse(
      "Enter an email address, such as ali@example.com.",
      "contactEmail",
    );
  }
  if (
    fields.address !== undefined &&
    fields.address.length > VENDOR_LIMITS.address
  ) {
    return refuse(
      `An address is at most ${VENDOR_LIMITS.address} characters.`,
      "address",
    );
  }
  if (fields.services !== undefined && fields.services.length === 0) {
    return refuse("Tick at least one thing it offers.", VENDOR_SERVICES_FIELD);
  }
  if (fields.locationIds !== undefined && fields.locationIds.length === 0) {
    return refuse(
      "Tick at least one location it serves.",
      VENDOR_LOCATIONS_FIELD,
    );
  }
  return { ok: true };
}

/**
 * A vendor form's values, read and checked. The services and the
 * locations come as one value each under their fields.
 */
export function parseVendorFields(
  values: Record<string, unknown>,
  services: readonly unknown[],
  locationIds: readonly unknown[],
): Parsed<VendorFields> {
  const kind = textOf(values.kind);
  const fields: VendorFields = {
    name: textOf(values.name),
    kind: isVendorKind(kind) ? kind : ("" as VendorKind),
    registrationNo: textOf(values.registrationNo).toUpperCase(),
    contactName: textOf(values.contactName),
    contactPhone: normalizePhone(textOf(values.contactPhone)),
    contactEmail: normalizeEmail(textOf(values.contactEmail)),
    address: textOf(values.address),
    services: vendorServicesOf(services.map(textOf)),
    locationIds: [...new Set(locationIds.map(textOf).filter(Boolean))].sort(),
  };
  const check = checkVendorFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}

/** A review note as the dialog sends it: the reason a vendor is refused or suspended. */
export function checkReviewNote(note: string): Change {
  if (note === "") {
    return refuse("Say why, for the team's record.", "reviewNote");
  }
  if (note.length > VENDOR_LIMITS.reviewNote) {
    return refuse(
      `A reason is at most ${VENDOR_LIMITS.reviewNote} characters.`,
      "reviewNote",
    );
  }
  return { ok: true };
}
