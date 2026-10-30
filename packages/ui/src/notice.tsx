import type { ReactNode } from "react";
import { cx } from "./cx.js";

const TONES = {
  /** Something to know before going on: a paused location, a draft, an old price. */
  warning: "ui:border-warning-edge ui:bg-warning-tint ui:text-warning-strong",
  /** Something wrong that the page cannot fix by itself. */
  danger: "ui:border-danger-edge ui:bg-danger-tint ui:text-danger",
  /** A plain note, in the brand's blue. */
  info: "ui:border-brand/20 ui:bg-brand-tint ui:text-navy",
} as const;

/**
 * A boxed line or two of notice on a page or in a dialog: both apps' one
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
        "ui:rounded-control ui:border ui:px-3.5 ui:py-2.5 ui:text-sm",
        TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
