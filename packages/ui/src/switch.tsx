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
        "ui:relative ui:inline-flex ui:h-6 ui:w-11 ui:shrink-0 ui:items-center ui:rounded-full ui:transition-colors ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900 ui:disabled:opacity-50",
        checked ? "ui:bg-emerald-600" : "ui:bg-neutral-300",
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
