import { refuse, type Change } from "./change";

/**
 * One rule for every delete in the console, pure and browser-safe. Before
 * it asks, the delete says what goes with the record and what changes
 * elsewhere, a sentence each (`DeleteImpact`), worked out on the server.
 * The alert dialog lists them. A delete that reaches past the record
 * itself, such as another location's routes, a public address or a
 * customer's choice, asks for its name to be typed as well. On the
 * server the delete works out its impact again, inside its transaction,
 * and refuses when it is not what the admin was shown
 * (`checkDeleteConfirmed`): nothing goes unannounced. Each record the
 * delete changes logs it in its own history.
 */

export type DeleteImpact = {
  /** What goes and what changes, a sentence each, in the order the dialog lists them. */
  lines: string[];
  /** What the admin types to confirm, for a delete that reaches past the record; null for none. */
  confirmWith: string | null;
};

/** What the admin saw and typed when they confirmed, as the action receives it. */
export type DeleteConfirmation = {
  seen: string[];
  typed: string | null;
};

export const IMPACT_CHANGED_MESSAGE =
  "What this delete takes has changed since you opened it. Read it again, then delete.";

/** A confirmation as a server action receives it; null for anything else. */
export function deleteConfirmationOf(
  seen: unknown,
  typed: unknown,
): DeleteConfirmation | null {
  if (
    !Array.isArray(seen) ||
    !seen.every((line): line is string => typeof line === "string") ||
    (typed !== null && typeof typed !== "string")
  ) {
    return null;
  }
  return { seen, typed };
}

/**
 * Whether the admin confirmed this delete as it stands: they were shown
 * every line of its impact, as it reads now, and typed what it asks for.
 */
export function checkDeleteConfirmed(
  impact: DeleteImpact,
  confirmation: DeleteConfirmation,
): Change {
  const { seen, typed } = confirmation;
  if (
    seen.length !== impact.lines.length ||
    seen.some((line, i) => line !== impact.lines[i])
  ) {
    return refuse(IMPACT_CHANGED_MESSAGE);
  }
  if (impact.confirmWith !== null && typed !== impact.confirmWith) {
    return refuse(`Type ${impact.confirmWith} to confirm.`);
  }
  return { ok: true };
}
