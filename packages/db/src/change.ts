/**
 * Why a write did not happen: a sentence the form shows as it is, saying
 * what to do, and the `name` of the form's field it is about when it is
 * about one, so the form shows it under that field. Browser-safe.
 */
export type Refusal = { ok: false; error: string; field?: string };

/** What a writer answers: done, or why not. Forms type their state with it. */
export type Change = { ok: true } | Refusal;

/** A write that makes a record, with the new id on success. */
export type Created = { ok: true; id: string } | Refusal;

/** A refusal, about the form's field `field` when one is named. */
export function refuse(error: string, field?: string): Refusal {
  return field ? { ok: false, error, field } : { ok: false, error };
}
