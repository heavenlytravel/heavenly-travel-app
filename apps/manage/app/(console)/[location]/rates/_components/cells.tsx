import { parseRinggit, ringgitInputValue } from "@repo/db";
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
  "block h-9 w-full min-w-24 rounded-lg border px-2.5 text-right text-sm tabular-nums outline-hidden transition-colors focus:border-brand focus:bg-white focus:bg-none focus:ring-2 focus:ring-brand/25 read-only:cursor-wait disabled:cursor-not-allowed disabled:bg-shade disabled:text-muted disabled:shadow-none";

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

/** A column of a price list: a class on sale here, with the category it is sold under. */
export type ClassColumn = { id: string; name: string; category: string };

/** What a cell holds: a price in sen, nothing, or text that is not a price. */
export type Reading = { ok: true; sen: number | null } | { ok: false };

export function readCell(text: string | undefined): Reading {
  const trimmed = (text ?? "").trim();
  if (trimmed === "") return { ok: true, sen: null };
  const sen = parseRinggit(trimmed);
  return sen === null ? { ok: false } : { ok: true, sen };
}

/** A value as the cell keeps it: "80" as "80.00", a lone dash as empty, anything else as typed. */
export function tidy(text: string): string {
  const trimmed = text.trim();
  if (/^[-–—]$/.test(trimmed)) return "";
  const reading = readCell(trimmed);
  return reading.ok && reading.sen !== null
    ? ringgitInputValue(reading.sen)
    : trimmed;
}

/** Neighbouring columns of one category, for the heading row above the class names. */
export function groupsOf(classes: readonly ClassColumn[]) {
  const groups: { label: string; span: number }[] = [];
  for (const column of classes) {
    const last = groups.at(-1);
    if (last && last.label === column.category) last.span += 1;
    else groups.push({ label: column.category, span: 1 });
  }
  return groups;
}

/** A zone's name cut to the column's width, whole in its tooltip. */
export const ZONE_NAME = "block max-w-44 truncate font-medium text-ink";

/** A price as it is compared with the save: sen, or null for empty or not a price. */
export function senOf(text: string | undefined): number | null {
  const reading = readCell(text);
  return reading.ok ? reading.sen : null;
}

/**
 * A price cell of a price list (hourly, tour guides): a box coloured by its
 * state against the save, tidied on leaving it; plain text when the list
 * is read-only. `className` is the table cell's, a line under it say.
 */
export function PriceCell({
  label,
  text,
  saved,
  invalid,
  readOnly,
  pending,
  onChange,
  className,
}: {
  /** What the cell prices, read out before it: "English, 4 hours". */
  label: string;
  text: string;
  saved: string | undefined;
  invalid: boolean;
  readOnly: boolean;
  pending: boolean;
  onChange: (text: string) => void;
  className?: string | false;
}) {
  const empty = text.trim() === "";
  return (
    <td className={cx(CELL_PAD, className)}>
      {readOnly ? (
        <span
          className={cx(
            "block h-9 min-w-24 rounded-lg px-2.5 text-right text-sm leading-9 text-ink tabular-nums",
            empty && EMPTY_CELL,
          )}
        >
          {/* Read out before the price: a label on a plain span is not. */}
          <span className="sr-only">{`${label}, ${empty ? "not sold" : "price in RM"} `}</span>
          {text}
        </span>
      ) : (
        <input
          aria-label={`${label}, price in RM`}
          aria-invalid={invalid || undefined}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          readOnly={pending}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={(event) => {
            const tidied = tidy(event.target.value);
            if (tidied !== event.target.value) onChange(tidied);
          }}
          className={cx(
            CELL_INPUT,
            invalid
              ? CELL_BAD
              : senOf(text) !== senOf(saved)
                ? CELL_CHANGED
                : cx(CELL_PLAIN, empty && EMPTY_CELL),
          )}
        />
      )}
    </td>
  );
}
