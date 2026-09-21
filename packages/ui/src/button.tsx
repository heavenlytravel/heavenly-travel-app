import { type ComponentProps } from "react";
import { cx } from "./cx.js";

const VARIANTS = {
  primary:
    "ui:bg-neutral-900 ui:text-white ui:hover:bg-neutral-700 ui:border-transparent",
  secondary:
    "ui:bg-white ui:text-neutral-900 ui:border-neutral-300 ui:hover:bg-neutral-100",
  danger: "ui:bg-white ui:text-red-700 ui:border-red-200 ui:hover:bg-red-50",
  ghost:
    "ui:bg-transparent ui:text-neutral-600 ui:border-transparent ui:hover:bg-neutral-100 ui:hover:text-neutral-900",
} as const;

const SIZES = {
  sm: "ui:h-8 ui:px-3 ui:text-xs",
  md: "ui:h-10 ui:px-4 ui:text-sm",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "ui:inline-flex ui:items-center ui:justify-center ui:gap-2 ui:rounded-md ui:border ui:font-medium ui:whitespace-nowrap ui:transition-colors ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900 ui:disabled:pointer-events-none ui:disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
