"use client";

import { cx } from "@repo/ui/cx";
import { radioKeys } from "../../../../_lib/radio-keys";

/**
 * A choice of two or three, as a segmented control, the one pressed lit
 * in white: the category, the kind of trip, the model, the reason for a
 * price. Arrow keys move between them, as in a radio group.
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
      className="inline-flex max-w-full flex-wrap gap-1 rounded-[10px] bg-slate-100 p-1"
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
              "rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
              size === "md" ? "h-8 px-3.5 text-sm" : "h-7 px-3 text-xs",
              on
                ? "bg-white text-ink shadow-control"
                : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
