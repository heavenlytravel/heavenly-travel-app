import { type ReactNode } from "react";
import { cx } from "./cx.js";

const TONES = {
  neutral: "ui:bg-neutral-100 ui:text-neutral-700",
  green: "ui:bg-emerald-50 ui:text-emerald-700",
  amber: "ui:bg-amber-50 ui:text-amber-800",
  blue: "ui:bg-blue-50 ui:text-blue-700",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "ui:inline-flex ui:items-center ui:rounded-full ui:px-2 ui:py-0.5 ui:text-xs ui:font-medium",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
