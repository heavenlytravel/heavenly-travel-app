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
        value > limit ? "font-medium text-red-700" : "text-neutral-500",
      )}
    >
      {value}/{limit}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}
