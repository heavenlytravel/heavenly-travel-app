import { cx } from "@repo/ui/cx";

/**
 * How a price cell looks wherever routes are priced, the rate grid and
 * its "Add route" dialog alike: a box drawn in every cell, so a cell looks
 * editable before it is clicked, inside a little padding (`CELL_PAD`).
 * Its state gives its colours, exactly one of them with `CELL_INPUT`:
 * plain (hatched too when empty, which is not offered as the legend under
 * it says), changed since the save, not a price, or deleted on the save.
 */
export const CELL_INPUT =
  "block h-9 w-full min-w-24 rounded-lg border px-2.5 text-right text-sm tabular-nums outline-hidden transition-colors focus:border-brand focus:bg-white focus:bg-none focus:ring-2 focus:ring-brand/25 read-only:cursor-wait";

/** The room round a cell's box in its table cell. */
export const CELL_PAD = "px-1.5 py-1.5";

/** A cell as saved, or a new one. */
export const CELL_PLAIN = "border-edge bg-white text-ink shadow-control";

/** A cell changed since the last save. */
export const CELL_CHANGED =
  "border-brand bg-brand-tint font-semibold text-brand";

/** A cell whose text is not a price. */
export const CELL_BAD = "border-danger-edge bg-danger-tint text-danger";

/** A cell of a route marked for deletion: no box, its price struck through. */
export const CELL_DOOMED =
  "border-transparent bg-transparent text-muted line-through";

export const EMPTY_CELL =
  "bg-[image:repeating-linear-gradient(-45deg,var(--card-edge)_0_1px,transparent_1px_6px)]";

/** What an empty cell means, as the legend says it: every trip is priced from the grid. */
export const EMPTY_CELL_MEANING =
  "Empty: the class is not offered on the route";

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
