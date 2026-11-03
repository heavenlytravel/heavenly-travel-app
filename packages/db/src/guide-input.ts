import { refuse, type Change } from "./change";
import type { DeleteImpact } from "./delete-impact";
import { dayOf, documentsDue, parseDay, type DocumentDue } from "./expiry";
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
  language: 30,
  languages: 8,
} as const;

/** The licences a guide keeps valid, in the form's order. */
export const GUIDE_DOCUMENTS = ["motacExpiresOn"] as const;
export type GuideDocument = (typeof GUIDE_DOCUMENTS)[number];

export const GUIDE_DOCUMENT_LABELS: Record<GuideDocument, string> = {
  motacExpiresOn: "MOTAC licence",
};

/** The form's field that carries the languages, as one line: "English, Mandarin". */
export const GUIDE_LANGUAGES_FIELD = "languages";

/** Every editable field of a guide. */
export type GuideFields = {
  /** Whose guide they are. */
  vendorId: string;
  name: string;
  /** As ./phone keeps it. */
  phone: string;
  locationId: string;
  /** The languages they guide in, each once, in the order typed. */
  languages: string[];
  isActive: boolean;
  notes: string;
} & Record<GuideDocument, string | null>;

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
  } & Record<GuideDocument, Date | null>,
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
  };
}

/** The guide's licences due within the warning or expired, soonest first. */
export function guideDocumentsDue(
  guide: Record<GuideDocument, Date | null>,
  now: Date = new Date(),
): DocumentDue[] {
  const days = Object.fromEntries(
    GUIDE_DOCUMENTS.map((key) => [key, dayOf(guide[key])]),
  ) as Record<GuideDocument, string | null>;
  return documentsDue(days, GUIDE_DOCUMENT_LABELS, now);
}

/** "English, mandarin ,English" as ["English", "mandarin"]: trimmed, each once, case aside. */
export function languagesOf(line: string): string[] {
  const seen = new Set<string>();
  const languages: string[] = [];
  for (const part of line.split(",")) {
    const language = part.trim().replace(/\s+/g, " ");
    if (!language || seen.has(language.toLowerCase())) continue;
    seen.add(language.toLowerCase());
    languages.push(language);
  }
  return languages;
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
  if (fields.languages !== undefined) {
    if (fields.languages.length === 0) {
      return refuse(
        "Enter the languages they guide in, such as English, Mandarin.",
        GUIDE_LANGUAGES_FIELD,
      );
    }
    if (fields.languages.length > GUIDE_LIMITS.languages) {
      return refuse(
        `At most ${GUIDE_LIMITS.languages} languages.`,
        GUIDE_LANGUAGES_FIELD,
      );
    }
    if (fields.languages.some((l) => l.length > GUIDE_LIMITS.language)) {
      return refuse(
        `A language is at most ${GUIDE_LIMITS.language} characters. Separate them with commas.`,
        GUIDE_LANGUAGES_FIELD,
      );
    }
  }
  if (fields.notes !== undefined && fields.notes.length > GUIDE_LIMITS.notes) {
    return refuse(
      `Notes are at most ${GUIDE_LIMITS.notes} characters.`,
      "notes",
    );
  }
  return { ok: true };
}

/**
 * The guide form's values, read and checked. The languages come as one
 * line, separated by commas; `isActive` is a checkbox; an empty date is
 * none.
 */
export function parseGuideFields(
  values: Record<string, unknown>,
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
    languages: languagesOf(textOf(values[GUIDE_LANGUAGES_FIELD])),
    isActive: flagOf(values.isActive),
    notes: textOf(values.notes),
    ...documents,
  };
  const check = checkGuideFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}

/** What deleting a guide takes (./delete-impact): them alone, since one who has been on a trip cannot be deleted. */
export const GUIDE_DELETE_IMPACT: DeleteImpact = {
  lines: ["They have not been on a trip, so no booking changes."],
  confirmWith: null,
};
