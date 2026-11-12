import {
  BANK_FIELD_LABELS,
  bankFieldsOf,
  checkBankFields,
  readBankFields,
  type BankFields,
} from "./bank-input";
import { isValidEmail, normalizeEmail } from "./booking-contact";
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
 * What a vendor offers: one of these, chosen at sign-up and changed by
 * staff alone, so the work it is offered stays what was checked when it
 * was approved. Vehicles, drivers and tour guides are worked in Connect;
 * attractions and accommodation are a supplier list for Reservation.
 * Agents, who sell our trips, are businesses (./businesses), not vendors.
 * Kept as the one value of `Vendor.services`.
 */
export const VENDOR_SERVICES = [
  "vehicle",
  "driver",
  "vehicle-driver",
  "tour-guide",
  "attraction",
  "accommodation",
] as const;
export type VendorService = (typeof VENDOR_SERVICES)[number];
export const isVendorService = guardFor(VENDOR_SERVICES);
export const VENDOR_SERVICE_LABELS: Record<VendorService, string> = {
  vehicle: "Vehicle only",
  driver: "Driver only",
  "vehicle-driver": "Vehicle and driver",
  "tour-guide": "Tour guide",
  attraction: "Attraction",
  accommodation: "Accommodation",
};

/** What a vendor adds and is offered work for. */
export type VendorSupply = "vehicle" | "driver" | "guide";

/**
 * The services that supply each: a vehicle of any class needs "vehicle
 * only" or "vehicle and driver", a driver "driver only" or "vehicle and
 * driver", a guide "tour guide". So a vehicle-only vendor is never asked
 * for a driver, nor a driver-only one for a vehicle.
 */
const SERVICES_FOR: Record<VendorSupply, readonly VendorService[]> = {
  vehicle: ["vehicle", "vehicle-driver"],
  driver: ["driver", "vehicle-driver"],
  guide: ["tour-guide"],
};

/** Whether a vendor supplies it, by what it offers. Ours supplies anything. */
export function suppliesIt(
  vendor: { isOurs: boolean; services: readonly string[] },
  supply: VendorSupply,
): boolean {
  return (
    vendor.isOurs ||
    SERVICES_FOR[supply].some((service) => vendor.services.includes(service))
  );
}

/** The order Assign lists vendors in, by what each offers, after ours. */
const GROUP_ORDER: readonly VendorService[] = [
  "vehicle-driver",
  "vehicle",
  "driver",
  "tour-guide",
];

/**
 * Vendors grouped as Assign lists them: ours first, then by what each
 * offers (Vehicle and driver, Vehicle only, Driver only, Tour guide), so
 * an individual who is their own driver sits under Driver only. Each
 * group keeps the order given; an empty one is left out.
 */
export function vendorGroupsOf<
  V extends { isOurs: boolean; services: readonly string[] },
>(vendors: readonly V[]): { label: string; vendors: V[] }[] {
  const groups = [
    { label: "Ours", vendors: vendors.filter((v) => v.isOurs) },
    ...GROUP_ORDER.map((service) => ({
      label: VENDOR_SERVICE_LABELS[service],
      vendors: vendors.filter((v) => !v.isOurs && v.services[0] === service),
    })),
    {
      label: "Other",
      vendors: vendors.filter(
        (v) =>
          !v.isOurs &&
          !GROUP_ORDER.some((service) => v.services[0] === service),
      ),
    },
  ];
  return groups.filter((group) => group.vendors.length > 0);
}

/** What a vendor adds: vehicles, drivers and tour guides. */
export type VendorAdds = {
  vehicles: boolean;
  drivers: boolean;
  guides: boolean;
};

/**
 * What a vendor's fleet lists, in Connect and on its page in Manage: each
 * part it supplies (`adds`) or has some of from before, which it sees and
 * cannot add to.
 */
export function vendorShowsOf(
  adds: VendorAdds,
  has: { vehicles: number; drivers: number; guides: number },
): VendorAdds {
  return {
    vehicles: adds.vehicles || has.vehicles > 0,
    drivers: adds.drivers || has.drivers > 0,
    guides: adds.guides || has.guides > 0,
  };
}

/** What a vendor may add, by what it offers (`suppliesIt`). */
export function vendorAddsOf(vendor: {
  isOurs: boolean;
  services: readonly string[];
}): VendorAdds {
  return {
    vehicles: suppliesIt(vendor, "vehicle"),
    drivers: suppliesIt(vendor, "driver"),
    guides: suppliesIt(vendor, "guide"),
  };
}

const SUPPLY_NOUNS: Record<VendorSupply, string> = {
  vehicle: "vehicles",
  driver: "drivers",
  guide: "tour guides",
};

/** Why a vendor cannot have it, naming what it would have to offer. */
export function supplyRefusalOf(vendorName: string, supply: VendorSupply) {
  const services = SERVICES_FOR[supply].map(
    (service) => VENDOR_SERVICE_LABELS[service],
  );
  return `${vendorName} does not offer ${SUPPLY_NOUNS[supply]}. Change what it offers to ${services.join(" or ")} first.`;
}

const SUPPLY_NOUN: Record<VendorSupply, string> = {
  vehicle: "vehicle",
  driver: "driver",
  guide: "tour guide",
};

/** How many vehicles, drivers and tour guides a vendor has. */
export type VendorHas = Record<VendorSupply, number>;

const AND = new Intl.ListFormat("en-GB", { type: "conjunction" });
const OR = new Intl.ListFormat("en-GB", { type: "disjunction" });

/**
 * Why a vendor may not change to offering `service`: it still has
 * vehicles, drivers or tour guides the new choice does not cover, which
 * staff remove first, so no vendor keeps what it no longer offers. Null
 * when the change may go ahead. Ours supplies anything.
 */
export function serviceChangeRefusalOf(
  vendor: { isOurs: boolean },
  service: VendorService,
  has: VendorHas,
): string | null {
  const offers = { isOurs: vendor.isOurs, services: [service] };
  const left = (Object.keys(SUPPLY_NOUNS) as VendorSupply[]).filter(
    (supply) => has[supply] > 0 && !suppliesIt(offers, supply),
  );
  if (left.length === 0) return null;
  const counts = left.map(
    (supply) =>
      `${has[supply]} ${has[supply] === 1 ? SUPPLY_NOUN[supply] : SUPPLY_NOUNS[supply]}`,
  );
  const nouns = left.map((supply) => SUPPLY_NOUNS[supply]);
  return `Remove its ${AND.format(counts)} first: ${VENDOR_SERVICE_LABELS[service]} does not cover ${OR.format(nouns)}.`;
}

/** The form's field that carries the one service chosen. */
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
  /**
   * What it offers: exactly one once saved. One stored before the single
   * choice, with none left after the old services went, reads empty.
   */
  services: VendorService[];
  /** The locations it serves, each once, sorted. */
  locationIds: string[];
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
  if (fields.services !== undefined && fields.services.length !== 1) {
    return refuse("Choose what it offers.", VENDOR_SERVICES_FIELD);
  }
  if (fields.locationIds !== undefined && fields.locationIds.length === 0) {
    return refuse(
      "Tick at least one location it serves.",
      VENDOR_LOCATIONS_FIELD,
    );
  }
  return checkBankFields(fields);
}

/**
 * A vendor form's values, read and checked. The service comes as one
 * value under its field, the locations as one value each under theirs;
 * more than one service is refused, as none is.
 */
export function parseVendorFields(
  values: Record<string, unknown>,
  services: readonly unknown[],
  locationIds: readonly unknown[],
): Parsed<VendorFields> {
  const kind = textOf(values.kind);
  const name = textOf(values.name);
  const fields: VendorFields = {
    name,
    kind: isVendorKind(kind) ? kind : ("" as VendorKind),
    registrationNo: textOf(values.registrationNo).toUpperCase(),
    // An individual is their own contact: no contact person is asked.
    contactName: kind === "individual" ? name : textOf(values.contactName),
    contactPhone: normalizePhone(textOf(values.contactPhone)),
    contactEmail: normalizeEmail(textOf(values.contactEmail)),
    address: textOf(values.address),
    services: vendorServicesOf(services.map(textOf)),
    locationIds: [...new Set(locationIds.map(textOf).filter(Boolean))].sort(),
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
