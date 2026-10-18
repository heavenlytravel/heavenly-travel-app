/**
 * What the "Add class" form and its action agree on, browser-safe: the
 * field that says whether the class comes from the catalogue or is new.
 */
export const SOURCE_FIELD = "source";

export const SOURCES = {
  catalogue: "catalogue",
  new: "new",
} as const;
