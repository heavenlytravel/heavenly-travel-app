import { isValidEmail, normalizeEmail } from "./booking-contact";
import {
  isPaymentTerms,
  MAX_DAYS_TO_PAY,
  type PaymentTerms,
} from "./billing-rules";
import { refuse, type Change } from "./change";
import { textOf, type Parsed } from "./fields";
import { isValidPhone, normalizePhone } from "./phone";

/**
 * The rules on what an agent's form takes: who it is, who the team speaks
 * to, how it pays. Pure and browser-safe; ./businesses writes them. The
 * terms are chosen when it is added and change only going forward, with a
 * reason (`changeBusinessTerms`).
 */

export const BUSINESS_LIMITS = {
  name: 120,
  registrationNo: 40,
  contactName: 120,
  address: 500,
} as const;

/** What an agent's form edits, its terms aside. */
export type BusinessProfile = {
  name: string;
  registrationNo: string;
  contactName: string;
  /** As ./phone keeps it. */
  contactPhone: string;
  /** Lowercase. */
  contactEmail: string;
  address: string;
};

/** What adding an agent takes: its profile and its terms. */
export type BusinessFields = BusinessProfile & {
  paymentTerms: PaymentTerms;
  daysToPay: number;
};

export type BusinessField = keyof BusinessFields;

/** How the screens and the activity log name each field. */
export const BUSINESS_FIELD_LABELS: Record<BusinessField, string> = {
  name: "Name",
  registrationNo: "SSM number",
  contactName: "Contact person",
  contactPhone: "Contact phone",
  contactEmail: "Billing email",
  address: "Billing address",
  paymentTerms: "Payment terms",
  daysToPay: "Days to pay",
};

/** The rules on a profile; a field left out is not checked. */
export function checkBusinessProfile(fields: Partial<BusinessProfile>): Change {
  if (fields.name !== undefined) {
    if (fields.name === "") return refuse("Enter the agent's name.", "name");
    if (fields.name.length > BUSINESS_LIMITS.name) {
      return refuse(
        `A name is at most ${BUSINESS_LIMITS.name} characters.`,
        "name",
      );
    }
  }
  if (
    fields.registrationNo !== undefined &&
    fields.registrationNo.length > BUSINESS_LIMITS.registrationNo
  ) {
    return refuse(
      `The number is at most ${BUSINESS_LIMITS.registrationNo} characters.`,
      "registrationNo",
    );
  }
  if (fields.contactName !== undefined) {
    if (fields.contactName === "") {
      return refuse("Enter who the team speaks to.", "contactName");
    }
    if (fields.contactName.length > BUSINESS_LIMITS.contactName) {
      return refuse(
        `A name is at most ${BUSINESS_LIMITS.contactName} characters.`,
        "contactName",
      );
    }
  }
  if (fields.contactPhone !== undefined && !isValidPhone(fields.contactPhone)) {
    return refuse("Enter a phone number the team can call.", "contactPhone");
  }
  if (fields.contactEmail !== undefined && !isValidEmail(fields.contactEmail)) {
    return refuse(
      "Enter the email invoices go to, such as accounts@example.com.",
      "contactEmail",
    );
  }
  if (
    fields.address !== undefined &&
    fields.address.length > BUSINESS_LIMITS.address
  ) {
    return refuse(
      `An address is at most ${BUSINESS_LIMITS.address} characters.`,
      "address",
    );
  }
  return { ok: true };
}

/** Days to pay as typed: a whole number from 0 to `MAX_DAYS_TO_PAY`. */
export function parseDaysToPay(typed: unknown): Parsed<number> {
  const text = textOf(typed);
  if (!/^\d{1,3}$/.test(text) || Number(text) > MAX_DAYS_TO_PAY) {
    return refuse(
      `Enter the days to pay, from 0 to ${MAX_DAYS_TO_PAY}.`,
      "daysToPay",
    );
  }
  return { ok: true, value: Number(text) };
}

/** The terms as chosen; an error when none is. */
export function parsePaymentTerms(typed: unknown): Parsed<PaymentTerms> {
  const value = textOf(typed);
  return isPaymentTerms(value)
    ? { ok: true, value }
    : refuse("Choose the payment terms.", "paymentTerms");
}

/** An agent's profile as its form posts it, read and checked. */
export function parseBusinessProfile(
  values: Record<string, unknown>,
): Parsed<BusinessProfile> {
  const fields: BusinessProfile = {
    name: textOf(values.name),
    registrationNo: textOf(values.registrationNo).toUpperCase(),
    contactName: textOf(values.contactName),
    contactPhone: normalizePhone(textOf(values.contactPhone)),
    contactEmail: normalizeEmail(textOf(values.contactEmail)),
    address: textOf(values.address),
  };
  const check = checkBusinessProfile(fields);
  return check.ok ? { ok: true, value: fields } : check;
}

/** A new agent as Add agent posts it: the profile and the terms. */
export function parseBusinessFields(
  values: Record<string, unknown>,
): Parsed<BusinessFields> {
  const profile = parseBusinessProfile(values);
  if (!profile.ok) return profile;
  const terms = parsePaymentTerms(values.paymentTerms);
  if (!terms.ok) return terms;
  const days = parseDaysToPay(values.daysToPay);
  if (!days.ok) return days;
  return {
    ok: true,
    value: {
      ...profile.value,
      paymentTerms: terms.value,
      daysToPay: days.value,
    },
  };
}
