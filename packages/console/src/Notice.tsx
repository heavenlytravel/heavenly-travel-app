import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";

const TONES = {
  /** Something to know before going on: a paused location, a draft, an old price. */
  warning: "border-warning-edge bg-warning-tint text-warning-strong",
  /** Something wrong that the page cannot fix by itself. */
  danger: "border-danger-edge bg-danger-tint text-danger",
  /** A plain note, in the brand's blue. */
  info: "border-brand/20 bg-brand-tint text-navy",
} as const;

/**
 * A boxed line or two of notice on a page or in a dialog: the console's one
 * look for it, amber by default. Not read out as it appears; a refusal of
 * the user's own action is a `FormError`.
 */
export function Notice({
  tone = "warning",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-control border px-3.5 py-2.5 text-sm",
        TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
