import type { PageSection } from "@repo/db";

/**
 * A row of a list in the form, with an id that stays while the form is
 * open, so a row moved keeps its fields. Not `key`: an uploaded image has
 * its own, UploadThing's.
 */
export type Rowed<T> = T & { rowId: string };

/** A section's lists of things, each thing with its row id; a list of ids as it is. */
type RowedLists<S> = {
  [K in keyof S]: S[K] extends readonly (infer Item extends object)[]
    ? Rowed<Item>[]
    : S[K];
};

/** A section as the form holds it: each item of its lists with a row id. */
export type FormSection = PageSection extends infer S
  ? S extends PageSection
    ? RowedLists<S>
    : never
  : never;

/** A form section of the type. */
export type FormSectionOf<T extends PageSection["type"]> = Extract<
  FormSection,
  { type: T }
>;

// Row ids only key the rows while the form is open, so a counter will do.
let nextRow = 0;

export const rowed = <T extends object>(item: T): Rowed<T> => ({
  ...item,
  rowId: `section-row-${nextRow++}`,
});

const hasRow = (item: object): item is Rowed<object> => "rowId" in item;

/**
 * The section as the form holds it: every item of its lists given a row
 * id, those that have one keeping it. What the form stores is read back
 * through the page's reader, which keeps only the fields a section has.
 */
export function formSectionOf(section: PageSection | FormSection): FormSection {
  const out: Record<string, unknown> = { ...section };
  for (const [field, value] of Object.entries(section)) {
    if (Array.isArray(value)) {
      out[field] = value.map((item: unknown) =>
        typeof item === "object" && item !== null && !hasRow(item)
          ? rowed(item)
          : item,
      );
    }
  }
  return out as FormSection;
}
