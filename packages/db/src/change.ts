/**
 * What a writer answers: done, or why not, in a sentence the form shows as
 * it is. Browser-safe, so forms can type their state with it.
 */
export type Change = { ok: true } | { ok: false; error: string };

/** A write that makes a record, with the new id on success. */
export type Created = { ok: true; id: string } | { ok: false; error: string };
