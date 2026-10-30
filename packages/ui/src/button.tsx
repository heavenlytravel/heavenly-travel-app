import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
} from "react";
import { cx } from "./cx.js";
import { SpinnerIcon } from "./icons.js";

/**
 * The button's corners, weight and the primary's glow come from the tokens
 * (`rounded-control`, `--control-weight`, `shadow-cta`), which each app sets
 * for its own look. Pressed looks as hovered does, for a touch screen has no
 * hover, and the button gives a little under the finger.
 */
const VARIANTS = {
  primary:
    "ui:bg-primary ui:text-primary-foreground ui:shadow-cta ui:hover:bg-brand-strong ui:active:bg-brand-strong ui:border-transparent",
  secondary:
    "ui:bg-white ui:text-body ui:border-edge ui:hover:bg-hairline ui:active:bg-hairline",
  /** The site's quiet choice beside a primary, in the brand's colour: change a trip, go back. */
  outline:
    "ui:bg-white ui:text-brand ui:border-card-edge ui:hover:border-brand ui:active:border-brand ui:disabled:hover:border-card-edge",
  /** A move that removes something, on a screen: quiet, in red. */
  danger:
    "ui:bg-white ui:text-danger ui:border-danger-edge ui:hover:bg-danger-tint ui:active:bg-danger-tint",
  /** A move that takes something from the public and can be undone, a pause: quiet, in amber. */
  caution:
    "ui:bg-white ui:text-warning ui:border-warning-edge ui:hover:bg-warning-tint ui:active:bg-warning-tint",
  /** The yes of a question whose answer deletes or loses something for good. */
  destructive:
    "ui:bg-danger ui:text-white ui:hover:bg-danger-strong ui:active:bg-danger-strong ui:border-transparent",
  ghost:
    "ui:bg-transparent ui:text-muted ui:border-transparent ui:hover:bg-hairline ui:hover:text-body ui:active:bg-hairline ui:active:text-body",
  /** `danger` without its edge, among quiet controls: remove a row, a choice. */
  "ghost-danger":
    "ui:bg-transparent ui:text-danger ui:border-transparent ui:hover:bg-danger-tint ui:hover:text-danger-strong ui:active:bg-danger-tint ui:active:text-danger-strong",
} as const;

/**
 * On a touch screen a button is 44px tall, or reaches that far around it.
 * `lg` is the site's booking buttons; the `icon` sizes are square, for a
 * button that is only an icon (and so needs an `aria-label`).
 */
const SIZES = {
  sm: "ui:h-8 ui:px-3 ui:text-xs ui:touch-target",
  md: "ui:h-10 ui:px-4 ui:text-sm ui:pointer-coarse:h-11",
  lg: "ui:h-12 ui:px-5 ui:text-base",
  "icon-sm": "ui:size-8 ui:px-0 ui:touch-target",
  icon: "ui:size-10 ui:px-0 ui:pointer-coarse:size-11",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Style the one child element (a `Link`) instead of rendering a button. */
  asChild?: boolean;
  /**
   * The work it started is under way: it looks disabled, spins, and
   * ignores presses, but keeps the focus (a disabled button would drop
   * it), and says so to screen readers (`aria-busy`).
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
    "ui:inline-flex ui:items-center ui:justify-center ui:gap-2 ui:rounded-control ui:border ui:[font-weight:var(--control-weight)] ui:whitespace-nowrap ui:transition-colors ui:focus-ring ui:active:scale-98 ui:disabled:scale-100 ui:disabled:cursor-not-allowed ui:disabled:opacity-50 ui:aria-busy:scale-100 ui:aria-busy:cursor-progress ui:aria-busy:opacity-50",
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
      // A press, or Enter in the form, while the work runs does nothing. Only
      // a pending button gets a handler of its own, so a server component
      // can still render a plain one (it can pass no functions).
      onClick={pending ? (event) => event.preventDefault() : onClick}
      {...props}
    >
      {pending ? <SpinnerIcon className="ui:size-4" /> : null}
      {/* A square icon button has room for one icon: the spinner, while it works. */}
      {pending && size.startsWith("icon") ? null : children}
    </button>
  );
}
