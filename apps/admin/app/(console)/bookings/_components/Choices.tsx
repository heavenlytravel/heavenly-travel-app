"use client";

import { cx } from "@repo/ui/cx";

/**
 * A choice of two or three, as buttons side by side, one of them pressed:
 * the category, the kind of trip, the reason for a price. Arrow keys move
 * between them, as in a radio group.
 */
export function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  /** What the group chooses, as a screen reader hears it. */
  label: string;
  /** The option pressed; null for none. */
  value: T | null;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-2"
      onKeyDown={(event) => {
        const step =
          event.key === "ArrowRight" || event.key === "ArrowDown"
            ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? -1
              : 0;
        if (!step) return;
        event.preventDefault();
        const at = options.findIndex((option) => option.value === value);
        const next =
          options[(at + step + options.length) % options.length] ?? options[0];
        if (!next) return;
        onChange(next.value);
        const buttons =
          event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
        buttons[options.indexOf(next)]?.focus();
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (value === null && option === options[0]) ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-full border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
              size === "md" ? "h-9 px-4 text-sm" : "h-7 px-3 text-xs",
              on
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:text-neutral-900",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
