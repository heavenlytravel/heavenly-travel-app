import { guardFor } from "./const-enum";

/**
 * A list's rows with one moved a place earlier or later, as the arrows on
 * a card or a row move it: the form's own rows before a save, or a
 * table's ordered rows, whose places a writer then numbers again. Pure and
 * browser-safe.
 */

/**
 * The rows with the one at `index` moved one place up (-1) or down (1);
 * null when it cannot go that way (the first up, the last down) or
 * `index` is not a row.
 */
export function movedRow<T>(
  rows: readonly T[],
  index: number,
  by: -1 | 1,
): T[] | null {
  const other = index + by;
  if (index < 0 || index >= rows.length || other < 0 || other >= rows.length) {
    return null;
  }
  const next = [...rows];
  const [row] = next.splice(index, 1);
  next.splice(other, 0, row as T);
  return next;
}

/**
 * What Marketing does to a row of a short list picked and ordered by hand,
 * such as the home page's top choices or the blog's highlighted posts:
 * add it at the end, take it off, or move it a place up or down.
 */
export const PICK_CHANGES = ["add", "remove", "up", "down"] as const;
export type PickChange = (typeof PICK_CHANGES)[number];
export const isPickChange = guardFor(PICK_CHANGES);

/**
 * The picked ids after the change, in their order: unchanged when there is
 * nothing to do (adding one picked already, removing one not picked,
 * moving the first up). "full" when an add would pass `cap`; "gone" when
 * the id to move is not picked, a screen opened before it was taken off.
 */
export function pickedAfter(
  ids: readonly string[],
  id: string,
  change: PickChange,
  cap: number,
): string[] | "full" | "gone" {
  const index = ids.indexOf(id);
  if (change === "add") {
    if (index >= 0) return [...ids];
    return ids.length >= cap ? "full" : [...ids, id];
  }
  if (index < 0) return change === "remove" ? [...ids] : "gone";
  if (change === "remove") return ids.filter((other) => other !== id);
  return movedRow(ids, index, change === "up" ? -1 : 1) ?? [...ids];
}
