import { cx } from "@repo/ui/cx";

/**
 * How far a location's setup has come, as a thin bar that fills in green:
 * in the location's panel, and on its card on the console's home.
 */
export function SetupBar({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label="Setup"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className={cx(
        "h-1.5 overflow-hidden rounded-full bg-neutral-200",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-emerald-600 transition-[width]"
        style={{ width: `${(done / total) * 100}%` }}
      />
    </div>
  );
}
