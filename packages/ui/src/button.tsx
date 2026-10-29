import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
} from "react";
import { cx } from "./cx.js";

/**
 * The button's corners and weight come from the tokens (`rounded-control`,
 * `--control-weight`), which each app sets for its own look.
 */
const VARIANTS = {
  primary:
    "ui:bg-primary ui:text-primary-foreground ui:hover:bg-brand-strong ui:border-transparent",
  secondary:
    "ui:bg-white ui:text-slate-900 ui:border-edge ui:hover:bg-slate-100",
  /** A move that removes something, on a screen: quiet, in red. */
  danger:
    "ui:bg-white ui:text-danger ui:border-danger-edge ui:hover:bg-danger-tint",
  /** A move that takes something from the public and can be undone, a pause: quiet, in amber. */
  caution:
    "ui:bg-white ui:text-warning ui:border-warning-edge ui:hover:bg-warning-tint",
  /** The yes of a question whose answer deletes or loses something for good. */
  destructive:
    "ui:bg-danger ui:text-white ui:hover:bg-danger-strong ui:border-transparent",
  ghost:
    "ui:bg-transparent ui:text-slate-600 ui:border-transparent ui:hover:bg-slate-100 ui:hover:text-slate-900",
} as const;

/** On a touch screen a button is 44px tall, or reaches that far around it. */
const SIZES = {
  sm: "ui:h-8 ui:px-3 ui:text-xs ui:touch-target",
  md: "ui:h-10 ui:px-4 ui:text-sm ui:pointer-coarse:h-11",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Style the one child element (a `Link`) instead of rendering a button. */
  asChild?: boolean;
  /**
   * The work it started is under way: it looks disabled and ignores
   * presses, but keeps the focus (a disabled button would drop it), and
   * says so to screen readers (`aria-busy`).
   */
  pending?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  asChild = false,
  pending = false,
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const classes = cx(
    "ui:inline-flex ui:items-center ui:justify-center ui:gap-2 ui:rounded-control ui:border ui:[font-weight:var(--control-weight)] ui:whitespace-nowrap ui:transition-colors ui:focus-ring ui:disabled:cursor-not-allowed ui:disabled:opacity-50 ui:aria-busy:cursor-progress ui:aria-busy:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cx(classes, child.props.className),
    });
  }
  return (
    <button
      type={type}
      className={classes}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={(event) => {
        // A press, or Enter in the form, while the work runs does nothing.
        if (pending) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
