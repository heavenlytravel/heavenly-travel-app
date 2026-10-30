import { locationStateOf, type LocationState } from "@repo/db";
import { cx } from "@repo/ui/cx";

const MARK_TONES: Record<LocationState, string> = {
  draft: "bg-hairline text-body",
  live: "bg-brand text-white",
  paused: "bg-warning-soft text-warning",
};

const MARK_SIZES = {
  /** Beside a row's label, in a list. */
  sm: "size-4.5 rounded text-2xs",
  /** Beside a name in the location picker's menu. */
  md: "size-5 rounded text-2xs",
  /** On the picker's button. */
  picker: "size-6.5 rounded-md text-xs",
  /** Beside a heading, a row of the dashboard. */
  lg: "size-8 rounded-lg text-sm",
} as const;

/**
 * A location's initial on a rounded square coloured by its state, brand
 * blue once live: beside its name in the location picker, a list or a
 * heading. `initial` says something else in its place: "All" for every
 * location.
 */
export function LocationMark({
  name,
  state,
  initial = name.charAt(0).toUpperCase(),
  size = "sm",
  className,
}: {
  name: string;
  state: string;
  initial?: string;
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
      {initial}
    </span>
  );
}
