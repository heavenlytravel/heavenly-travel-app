import { locationStateOf, type LocationState } from "@repo/db";
import { cx } from "@repo/ui/cx";

const MARK_TONES: Record<LocationState, string> = {
  draft: "bg-slate-200 text-slate-700",
  live: "bg-emerald-100 text-emerald-800",
  paused: "bg-amber-100 text-amber-800",
};

const MARK_SIZES = {
  /** Beside a row's label, in a list. */
  sm: "size-4 text-[10px]",
  /** Beside a name in the location picker and its menu. */
  md: "size-5 text-[11px]",
  /** Beside a heading. */
  lg: "size-8 text-sm",
} as const;

/**
 * A location's initial in a disc coloured by its state: beside its name
 * in the location picker, a list or a heading.
 */
export function LocationMark({
  name,
  state,
  size = "sm",
  className,
}: {
  name: string;
  state: string;
  size?: keyof typeof MARK_SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        MARK_SIZES[size],
        MARK_TONES[locationStateOf(state)],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
