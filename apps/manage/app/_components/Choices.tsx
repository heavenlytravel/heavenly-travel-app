"use client";

import { cx } from "@repo/ui/cx";
import { radioKeys } from "../_lib/radio-keys";

/**
 * A choice of two or three, as a segmented control: the options on a
 * grey track, the one taken lit in white. The console's one look for a
 * one-of-many choice: the category, the kind of trip, the model, the
 * reason for a price, a charge in percent or ringgit, what a click on a
 * map places. Arrow keys move between them, as in a radio group.
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
  /**
   * `label` is the word on the option; `name`, when the word alone says
   * too little ("%"), is what a screen reader hears instead.
   */
  options: readonly { value: T; label: string; name?: string }[];
  onChange: (value: T) => void;
  /** `md` stands as tall as a field beside it, 40px; `sm` is 36px. */
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
      className="inline-flex max-w-full flex-wrap gap-1 rounded-control bg-hairline p-1"
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
            aria-label={option.name}
            tabIndex={keys.tabIndexOf(index)}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-lg font-semibold transition-colors focus-ring",
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
