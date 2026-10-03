import { cx } from "@repo/ui/cx";

/**
 * Whether Operation serves pickups in a district, as a dot beside its name:
 * filled green when they are on, a grey ring when they are off. The words
 * are in the info tooltip of the list the dot is in, in the dot's own
 * tooltip, and read to a screen reader on every dot.
 */
export function PickupDot({
  on,
  className,
}: {
  on: boolean;
  className?: string;
}) {
  const label = on ? "Pickups on" : "Pickups off";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cx(
        "inline-block size-2 shrink-0 rounded-full",
        on ? "bg-emerald-500" : "border border-neutral-400",
        className,
      )}
    />
  );
}

/** What the dots mean, for the info tooltip of a list of districts. */
export const PICKUP_DOT_TIP =
  "A green dot beside a district means Operation serves pickups there; a grey ring means it does not.";
