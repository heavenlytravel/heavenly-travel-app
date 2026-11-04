import {
  BANK_FIELD_LABELS,
  bankFieldsOf,
  checkBankFields,
  readBankFields,
  type BankFields,
} from "./bank-input";
import { isValidEmail, normalizeEmail } from "./booking-contact";
import { isInvoicePeriod, type InvoicePeriod } from "./booking-number";
import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import { textOf, type Parsed } from "./fields";
import { isValidPhone, normalizePhone } from "./phone";
import { parseSignInCheck, type NewUserFields } from "./user-input";

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
 * What a vendor may supply, asked of every kind at sign-up. Transport and
 * tour guides are worked in Connect; the rest is a supplier list for
 * Reservation. An agent sells our trips to its own customers: its bookings
 * share its invoice for the period, and it is never offered work.
 */
export const VENDOR_SERVICES = [
  "car-with-driver",
  "coach-charter",
  "driver",
  "tour-guide",
  "self-drive",
  "accommodation",
  "attraction",
  "agent",
] as const;
export type VendorService = (typeof VENDOR_SERVICES)[number];
export const isVendorService = guardFor(VENDOR_SERVICES);
export const VENDOR_SERVICE_LABELS: Record<VendorService, string> = {
  "car-with-driver": "Car with driver",
  "coach-charter": "Coach charter",
  driver: "Driver only",
  "tour-guide": "Tour guide",
  "self-drive": "Self-drive rental",
  accommodation: "Accommodation",
  attraction: "Attraction",
  agent: "Agent",
};

/**
 * What a vendor adds and is offered work for, and the services that allow
 * it: a vehicle of a class needs the class's category, car with driver or
 * coach charter; a driver any of those or "driver only"; a guide "tour
 * guide". Ours supplies anything.
 */
export type VendorSupply =
  | { kind: "vehicle"; category: string }
  | { kind: "driver" }
  | { kind: "guide" };

function servicesFor(supply: VendorSupply): readonly string[] {
  switch (supply.kind) {
    case "vehicle":
      return [supply.category];
    case "driver":
      return ["car-with-driver", "coach-charter", "driver"];
    case "guide":
      return ["tour-guide"];
  }
}

/** Whether a vendor supplies it, by the services it ticked. */
export function suppliesIt(
  vendor: { isOurs: boolean; services: readonly string[] },
  supply: VendorSupply,
): boolean {
  return (
    vendor.isOurs ||
    servicesFor(supply).some((service) => vendor.services.includes(service))
  );
}

/** Why a vendor cannot have it, naming the services to tick. */
export function supplyRefusalOf(vendorName: string, supply: VendorSupply) {
  const what =
    supply.kind === "vehicle"
      ? "vehicles of this class"
      : supply.kind === "driver"
        ? "drivers"
        : "tour guides";
  const services = servicesFor(supply).map((service) =>
    isVendorService(service) ? VENDOR_SERVICE_LABELS[service] : service,
  );
  return `${vendorName} does not offer ${what}. Tick ${services.join(" or ")} in its services first.`;
}

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
  /** How often it is invoiced as an agent; "month" for any other vendor. */
  invoicePeriod: InvoicePeriod;
} & BankFields;

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
  invoicePeriod: "Agent invoices",
  ...BANK_FIELD_LABELS,
};

/** The services among the values, once each, in `VENDOR_SERVICES` order. */
export function vendorServicesOf(values: readonly unknown[]): VendorService[] {
  return VENDOR_SERVICES.filter((service) => values.includes(service));
}

/** A stored vendor's fields as the forms and the log read them. */
export function vendorFieldsOf(
  vendor: {
    name: string;
    kind: string;
    registrationNo: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    services: readonly string[];
    locations: readonly { id: string }[];
    invoicePeriod: string;
  } & BankFields,
): VendorFields {
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
    invoicePeriod: isInvoicePeriod(vendor.invoicePeriod)
      ? vendor.invoicePeriod
      : "month",
    ...bankFieldsOf(vendor),
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
  if (
    fields.invoicePeriod !== undefined &&
    !isInvoicePeriod(fields.invoicePeriod)
  ) {
    return refuse("Choose how often the agent is invoiced.", "invoicePeriod");
  }
  return checkBankFields(fields);
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
    // Asked of an agent on the admin's form only; monthly otherwise.
    invoicePeriod: isInvoicePeriod(textOf(values.invoicePeriod))
      ? (textOf(values.invoicePeriod) as InvoicePeriod)
      : "month",
    ...readBankFields(values),
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

/**
 * Who signs in to Connect as the owner of a vendor staff enter, as Add
 * vendor asks it: the email twice and a password, or none for a code.
 * Left empty, the vendor has no Connect account until SUPER sets its
 * owner. A new account is named after the contact, and keeps their
 * phone. See docs/261102-direct-accounts.md.
 */
export function parseVendorOwner(
  values: Record<string, unknown>,
  contact: { contactName: string; contactPhone: string },
): Parsed<NewUserFields | null> {
  const email = normalizeEmail(textOf(values.email));
  if (email && !isValidEmail(email)) {
    return refuse(
      "Enter an email like name@example.com, or leave it empty.",
      "email",
    );
  }
  const password = parseSignInCheck(values, email || null);
  if (!password.ok) return password;
  if (!email) return { ok: true, value: null };
  return {
    ok: true,
    value: {
      email,
      firstName: contact.contactName,
      lastName: "",
      phone: contact.contactPhone,
      password: password.value,
    },
  };
}
