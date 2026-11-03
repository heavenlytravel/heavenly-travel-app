import {
  BANK_FIELD_LABELS,
  bankFieldsOf,
  checkBankFields,
  readBankFields,
  type BankFields,
} from "./bank-input";
import { refuse, type Change } from "./change";
import type { DeleteImpact } from "./delete-impact";
import { dayOf, parseDay } from "./expiry";
import { flagOf, textOf, type Parsed } from "./fields";
import { isValidPhone, normalizePhone } from "./phone";

/**
 * What the Guides tab edits of a vendor's tour guide and the rules it
 * checks, pure and browser-safe: the form shows the messages, the writers
 * in ./guides apply the same checks before they write. A guide has no
 * account: their vendor accepts for them. See docs/261103-tour-guide.md.
 */

export const GUIDE_LIMITS = {
  name: 80,
  notes: 500,
} as const;

/**
 * The languages a guide may guide in and a customer may ask for, in the
 * order the boxes show: one list for both, so a trip's languages and a
 * guide's match word for word. A new one is added here.
 */
export const GUIDE_LANGUAGES = [
  "English",
  "Malay",
  "Mandarin",
  "Cantonese",
  "Tamil",
  "Hindi",
  "Indonesian",
  "Thai",
  "Arabic",
  "Japanese",
  "Korean",
  "French",
  "German",
  "Russian",
] as const;

/** The known languages among posted values, each once, in the list's order. */
export function guideLanguagesOf(values: readonly unknown[]): string[] {
  const posted = new Set(values.map(textOf));
  return GUIDE_LANGUAGES.filter((language) => posted.has(language));
}

/** The licences a guide keeps valid, in the form's order. */
export const GUIDE_DOCUMENTS = ["motacExpiresOn"] as const;
export type GuideDocument = (typeof GUIDE_DOCUMENTS)[number];

export const GUIDE_DOCUMENT_LABELS: Record<GuideDocument, string> = {
  motacExpiresOn: "MOTAC licence",
};

/** The form's boxes that carry the languages, one value each. */
export const GUIDE_LANGUAGES_FIELD = "languages";

/** Every editable field of a guide. */
export type GuideFields = {
  /** Whose guide they are. */
  vendorId: string;
  name: string;
  /** As ./phone keeps it. */
  phone: string;
  locationId: string;
  /** The languages they guide in, from `GUIDE_LANGUAGES`, in its order. */
  languages: string[];
  isActive: boolean;
  notes: string;
} & Record<GuideDocument, string | null> &
  BankFields;

export type GuideField = keyof GuideFields;

/** How the screen and the activity log name each field. */
export const GUIDE_FIELD_LABELS: Record<GuideField, string> = {
  vendorId: "Vendor",
  name: "Name",
  phone: "Phone",
  locationId: "Based at",
  languages: "Languages",
  isActive: "Active",
  notes: "Notes",
  ...GUIDE_DOCUMENT_LABELS,
  ...BANK_FIELD_LABELS,
};

/** A stored guide's fields as the form and the log read them: their dates as days. */
export function guideFieldsOf(
  guide: {
    vendorId: string;
    name: string;
    phone: string;
    locationId: string;
    languages: readonly string[];
    isActive: boolean;
    notes: string;
  } & Record<GuideDocument, Date | null> &
    BankFields,
): GuideFields {
  return {
    vendorId: guide.vendorId,
    name: guide.name,
    phone: guide.phone,
    locationId: guide.locationId,
    languages: [...guide.languages],
    isActive: guide.isActive,
    notes: guide.notes,
    motacExpiresOn: dayOf(guide.motacExpiresOn),
    ...bankFieldsOf(guide),
  };
}

/** The rules on a guide's fields; a field left out is not checked. */
export function checkGuideFields(fields: Partial<GuideFields>): Change {
  if (fields.vendorId !== undefined && !fields.vendorId) {
    return refuse("Choose whose guide they are.", "vendorId");
  }
  if (fields.name !== undefined) {
    if (fields.name === "") return refuse("Enter the guide's name.", "name");
    if (fields.name.length > GUIDE_LIMITS.name) {
      return refuse(
        `A name is at most ${GUIDE_LIMITS.name} characters.`,
        "name",
      );
    }
  }
  if (fields.phone !== undefined && !isValidPhone(fields.phone)) {
    return refuse("Enter a phone number the team can call.", "phone");
  }
  if (fields.locationId !== undefined && !fields.locationId) {
    return refuse("Choose where they are based.", "locationId");
  }
  if (fields.languages !== undefined && fields.languages.length === 0) {
    return refuse("Tick the languages they guide in.", GUIDE_LANGUAGES_FIELD);
  }
  if (fields.notes !== undefined && fields.notes.length > GUIDE_LIMITS.notes) {
    return refuse(
      `Notes are at most ${GUIDE_LIMITS.notes} characters.`,
      "notes",
    );
  }
  return checkBankFields(fields);
}

/**
 * The guide form's values, read and checked. The languages come as the
 * ticked boxes' values, `formData.getAll(GUIDE_LANGUAGES_FIELD)`;
 * `isActive` is a checkbox; an empty date is none.
 */
export function parseGuideFields(
  values: Record<string, unknown>,
  languages: readonly unknown[],
): Parsed<GuideFields> {
  const documents = {} as Record<GuideDocument, string | null>;
  for (const key of GUIDE_DOCUMENTS) {
    const day = parseDay(values[key], GUIDE_DOCUMENT_LABELS[key], key);
    if (!day.ok) return day;
    documents[key] = day.value;
  }
  const fields: GuideFields = {
    vendorId: textOf(values.vendorId),
    name: textOf(values.name),
    phone: normalizePhone(textOf(values.phone)),
    locationId: textOf(values.locationId),
    languages: guideLanguagesOf(languages),
    isActive: flagOf(values.isActive),
    notes: textOf(values.notes),
    ...documents,
    ...readBankFields(values),
  };
  const check = checkGuideFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}

/** What deleting a guide takes (./delete-impact): them alone, since one who has been on a trip cannot be deleted. */
export const GUIDE_DELETE_IMPACT: DeleteImpact = {
  lines: ["They have not been on a trip, so no booking changes."],
  confirmWith: null,
};
