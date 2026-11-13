import { refuse, type Change } from "./change";
import { flagOf, textOf } from "./fields";

/**
 * Where we pay someone: a vendor company for its vehicles, a driver or a
 * tour guide for their own work. The bank, the account number and the
 * name on the account, all three or none. Kept on Vendor, Driver and
 * Guide alike, entered on their forms, and shown blurred until clicked
 * (@repo/ui/secret); the activity log keeps only their end (`maskTail`). Pure and
 * browser-safe. See docs/261103-tour-guide.md, "Pay and bank details".
 */

/** The banks an account may be at, in the order the form lists them. */
export const MALAYSIAN_BANKS = [
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "Bank Rakyat",
  "Bank Muamalat",
  "Affin Bank",
  "Alliance Bank",
  "Agrobank",
  "BSN",
  "MBSB Bank",
  "Al Rajhi Bank",
  "Kuwait Finance House",
  "OCBC Bank",
  "HSBC Bank",
  "UOB Bank",
  "Standard Chartered",
  "GXBank",
  "Boost Bank",
  "AEON Bank",
] as const;

export const BANK_LIMITS = {
  accountName: 80,
  /** Malaysian account numbers run 7 to 16 digits; a little room either side. */
  accountDigits: { min: 6, max: 20 },
} as const;

export type BankFields = {
  /** From `MALAYSIAN_BANKS`; empty when none is given. */
  bankName: string;
  /** Digits only; empty when none is given. */
  bankAccountNumber: string;
  bankAccountName: string;
};

export type BankField = keyof BankFields;

export const BANK_FIELD_LABELS: Record<BankField, string> = {
  bankName: "Bank",
  bankAccountNumber: "Account Number",
  bankAccountName: "Name on the Account",
};

export const NO_BANK: BankFields = {
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
};

/** A stored record's bank details, as the forms and the log read them. */
export function bankFieldsOf(record: BankFields): BankFields {
  return {
    bankName: record.bankName,
    bankAccountNumber: record.bankAccountNumber,
    bankAccountName: record.bankAccountName,
  };
}

/** A form's bank details: the number's spaces and dashes dropped, the name trimmed. */
export function readBankFields(values: Record<string, unknown>): BankFields {
  return {
    bankName: textOf(values.bankName),
    bankAccountNumber: textOf(values.bankAccountNumber).replace(/[\s-]/g, ""),
    bankAccountName: textOf(values.bankAccountName),
  };
}

/**
 * Whom a driver's or a guide's pay goes to: their own account, the bank
 * details given, or their vendor's, with none of their own. Each record
 * chooses for itself, so one person who drives and guides may be paid to
 * two accounts, or one, or to the business for either.
 */
export type PayeeFields = BankFields & { paidToVendor: boolean };

export const PAID_TO_FIELD = "paidToVendor";

export const PAID_TO_LABELS = {
  own: "Their Own Account",
  vendor: "The Vendor's Account",
} as const;

export const PAYEE_FIELD_LABELS: Record<keyof PayeeFields, string> = {
  paidToVendor: "Paid to the Vendor",
  ...BANK_FIELD_LABELS,
};

/** A stored driver's or guide's payee, as the forms and the log read it. */
export function payeeFieldsOf(record: PayeeFields): PayeeFields {
  return { paidToVendor: record.paidToVendor, ...bankFieldsOf(record) };
}

/** A form's payee: paid to the vendor keeps no bank details of its own. */
export function readPayeeFields(values: Record<string, unknown>): PayeeFields {
  const paidToVendor = flagOf(values[PAID_TO_FIELD]);
  return {
    paidToVendor,
    ...(paidToVendor ? NO_BANK : readBankFields(values)),
  };
}

/** The rules on the bank details: a known bank, a number of digits and a name, all three or none. */
export function checkBankFields(fields: Partial<BankFields>): Change {
  const { bankName, bankAccountNumber, bankAccountName } = fields;
  const given = [bankName, bankAccountNumber, bankAccountName];
  if (given.every((value) => value === undefined || value === "")) {
    return { ok: true };
  }
  if (
    bankName !== undefined &&
    !(MALAYSIAN_BANKS as readonly string[]).includes(bankName)
  ) {
    return refuse("Choose the bank.", "bankName");
  }
  if (bankAccountNumber !== undefined) {
    const { min, max } = BANK_LIMITS.accountDigits;
    if (!new RegExp(`^\\d{${min},${max}}$`).test(bankAccountNumber)) {
      return refuse(
        `Enter the account number, ${min} to ${max} digits.`,
        "bankAccountNumber",
      );
    }
  }
  if (bankAccountName !== undefined) {
    if (bankAccountName === "") {
      return refuse("Enter the name on the account.", "bankAccountName");
    }
    if (bankAccountName.length > BANK_LIMITS.accountName) {
      return refuse(
        `A name is at most ${BANK_LIMITS.accountName} characters.`,
        "bankAccountName",
      );
    }
  }
  return { ok: true };
}

/** "ending 4821": an account number or an IC by its last four only, as the log keeps it; empty for none. */
export function maskTail(number: string): string {
  if (number === "") return "";
  return `ending ${number.slice(-4)}`;
}

/** The fields kept whole in the database and masked everywhere they show: an account number, and a vendor's SSM or IC number. */
export const MASKED_FIELDS = ["bankAccountNumber", "registrationNo"] as const;

/** An entry's before or after with those fields masked, so the activity log never keeps one whole. */
export function maskedForLog<T>(value: T): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const entry = { ...(value as Record<string, unknown>) };
  for (const key of MASKED_FIELDS) {
    const field = entry[key];
    if (typeof field === "string") entry[key] = maskTail(field);
  }
  return entry as T;
}
