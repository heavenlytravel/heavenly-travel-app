"use client";

import { cx } from "@repo/ui/cx";
import { radioKeys } from "../../../_lib/radio-keys";

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
  const keys = radioKeys({
    count: options.length,
    chosen: options.findIndex((option) => option.value === value),
    choose: (index) => onChange(options[index]!.value),
  });
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-2"
      onKeyDown={keys.onKeyDown}
    >
      {options.map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={keys.tabIndexOf(index)}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-full border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              size === "md" ? "h-9 px-4 text-sm" : "h-7 px-3 text-xs",
              on
                ? "border-brand bg-brand text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
