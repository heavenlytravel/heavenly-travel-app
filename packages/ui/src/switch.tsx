import { cx } from "./cx.js";

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Read by screen readers; the switch has no visible text of its own. */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cx(
        "ui:touch-target ui:inline-flex ui:h-6 ui:w-11 ui:shrink-0 ui:items-center ui:rounded-full ui:transition-colors ui:focus-ring ui:disabled:cursor-not-allowed ui:disabled:opacity-50",
        // Off, the track is the strong edge, 3:1 on white as a control must be.
        checked ? "ui:bg-brand" : "ui:bg-edge-strong",
      )}
    >
      <span
        className={cx(
          "ui:inline-block ui:size-5 ui:rounded-full ui:bg-white ui:shadow-sm ui:transition-transform",
          checked ? "ui:translate-x-5.5" : "ui:translate-x-0.5",
        )}
      />
    </button>
  );
}
