import { locationStateOf, type LocationState } from "@repo/db";
import { cx } from "@repo/ui/cx";

const MARK_TONES: Record<LocationState, string> = {
  draft: "bg-slate-200 text-slate-700",
  live: "bg-brand text-white",
  paused: "bg-amber-100 text-amber-800",
};

const MARK_SIZES = {
  /** Beside a row's label, in a list. */
  sm: "size-[18px] rounded-[5px] text-[10px]",
  /** Beside a name in the location picker's menu. */
  md: "size-5 rounded-[5px] text-[11px]",
  /** On the picker's button. */
  picker: "size-[26px] rounded-[7px] text-xs",
  /** Beside a heading, a row of the dashboard. */
  lg: "size-8 rounded-lg text-sm",
} as const;

/**
 * A location's initial on a rounded square coloured by its state, brand
 * blue once live: beside its name in the location picker, a list or a
 * heading.
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
        "flex shrink-0 items-center justify-center font-bold",
        MARK_SIZES[size],
        MARK_TONES[locationStateOf(state)],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
