import { cx } from "@repo/ui/cx";

/** How much of a limit a text has used, "42/60", in red once it is over. */
export function Count({
  value,
  limit,
  unit,
}: {
  value: number;
  limit: number;
  /** What is counted when it is not characters: "words". */
  unit?: string;
}) {
  return (
    <span
      className={cx(
        "text-xs font-normal tabular-nums",
        value > limit ? "font-medium text-danger" : "text-muted",
      )}
    >
      {value}/{limit}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}

/** A label with how much of its limit the text has used. */
export function Counted({
  label,
  value,
  limit,
}: {
  label: string;
  value: string;
  limit: number;
}) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      {label}
      <Count value={value.length} limit={limit} />
    </span>
  );
}
