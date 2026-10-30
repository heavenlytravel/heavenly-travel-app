import { twMerge } from "tailwind-merge";

/*
 * Every other Connect button is `@repo/ui`'s `Button`. These classes are
 * left for the registration and the access screens alone, in its look
 * (corners, weight and ring from the tokens), until they move to it too.
 */

const VARIANTS = {
  /** The one move a screen is for: `Button`'s `primary`. */
  primary:
    "border-transparent bg-brand text-white shadow-cta hover:bg-brand-strong active:bg-brand-strong",
  /** A move at hand: `Button`'s `outline`. */
  soft: "border-card-edge bg-white text-brand hover:border-brand active:border-brand",
} as const;

const SIZES = {
  md: "h-10 gap-2 px-4 text-sm pointer-coarse:h-11",
  lg: "h-12 gap-2 px-5 text-base",
} as const;

/** `Button`'s classes, for a `button`, a `Link` or an `a`; a `className` given overrides those it clashes with. */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
} = {}) {
  return twMerge(
    "inline-flex items-center justify-center rounded-control border [font-weight:var(--control-weight)] whitespace-nowrap transition-colors select-none focus-ring active:scale-98 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
