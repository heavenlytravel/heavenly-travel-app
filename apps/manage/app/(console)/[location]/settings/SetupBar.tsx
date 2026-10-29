import { cx } from "@repo/ui/cx";

/**
 * How far a location's setup has come, as a thin bar that fills in brand
 * blue, as its steps' marks do: on a draft's checklist, on its tile in
 * Settings and on its row of the dashboard's By location.
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
        "h-1.5 overflow-hidden rounded-full bg-slate-200",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-brand transition-[width]"
        style={{ width: `${(done / total) * 100}%` }}
      />
    </div>
  );
}
