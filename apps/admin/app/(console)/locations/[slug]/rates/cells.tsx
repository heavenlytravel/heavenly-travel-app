import type { DropoffRule } from "@repo/db";
import { cx } from "@repo/ui/cx";

/**
 * How a price cell looks wherever routes are priced, the rate grid and
 * its "Add route" dialog alike: a borderless input filling its cell, and
 * the hatch of a cell left empty, which is metered or not offered as the
 * legend under it says.
 */
export const CELL_INPUT =
  "block h-10 w-full min-w-24 bg-transparent px-3 text-right text-sm tabular-nums outline-hidden focus:bg-white focus:ring-2 focus:ring-brand focus:ring-inset read-only:cursor-wait";

export const EMPTY_CELL =
  "bg-[image:repeating-linear-gradient(-45deg,var(--color-slate-200)_0_1px,transparent_1px_6px)]";

/** What an empty cell means under the location's drop-off rule, as the legend says it. */
export function emptyCellMeaning(rule: DropoffRule) {
  return rule === "grid"
    ? "Empty: the class is not offered on the route"
    : "Empty: metered at the class's rates";
}

/** A swatch and what it marks, for the legend under a table of prices. */
export function CellKey({
  swatch,
  children,
}: {
  swatch: string;
  children: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cx("size-3 shrink-0 rounded-sm border", swatch)}
      />
      {children}
    </span>
  );
}
