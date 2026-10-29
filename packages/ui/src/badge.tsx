import { type ReactNode } from "react";
import { cx } from "./cx.js";

/**
 * A chip's colours, one per meaning: amber waits on someone, brand is
 * agreed, navy is in hand, green is done, neutral has stepped aside, and
 * red is a real problem alone (an expired document, a failed action).
 * Each pair reads at 4.5:1 or better.
 */
const TONES = {
  neutral: "ui:bg-slate-100 ui:text-slate-600",
  amber: "ui:bg-warning-soft ui:text-warning",
  brand: "ui:bg-brand-tint ui:text-brand-strong",
  navy: "ui:bg-navy/10 ui:text-navy",
  green: "ui:bg-success-tint ui:text-success",
  red: "ui:bg-danger-tint ui:text-danger",
} as const;

export type BadgeTone = keyof typeof TONES;

/**
 * A pill with a short word in it: a status, a count's name, a tag. With
 * `dot`, a disc in its own colour before the word, as a status has.
 */
export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  /** A status: a disc before the word. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "ui:inline-flex ui:h-6 ui:shrink-0 ui:items-center ui:gap-1.5 ui:rounded-full ui:px-2.5 ui:text-xs ui:font-semibold ui:whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="ui:size-1.5 ui:shrink-0 ui:rounded-full ui:bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
