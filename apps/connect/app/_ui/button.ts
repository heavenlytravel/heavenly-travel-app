import { twMerge } from "tailwind-merge";

const VARIANTS = {
  /** The one move a screen is for. */
  primary:
    "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(4,107,210,0.7)] hover:bg-brand-strong active:bg-brand-strong",
  /** A strong move on a light panel that is not the main one. */
  dark: "bg-ink text-white hover:bg-navy active:bg-navy",
  /** A move at hand: call, message, navigate. */
  soft: "bg-mist text-navy hover:bg-brand-tint active:bg-brand-tint",
  /** A quiet alternative: back, decline. */
  outline:
    "bg-white text-slate-700 ring-1 ring-slate-200 ring-inset hover:bg-slate-50 active:bg-slate-100",
  /** Something went wrong: a problem, a no-show. */
  danger:
    "bg-white text-red-700 ring-1 ring-red-200 ring-inset hover:bg-red-50 active:bg-red-50",
  /** Sends something wrong to Operation: a problem. */
  alarm: "bg-red-600 text-white hover:bg-red-700 active:bg-red-700",
  /** On the ink band. */
  glass:
    "bg-white/10 text-white ring-1 ring-white/15 ring-inset hover:bg-white/15 active:bg-white/20",
} as const;

const SIZES = {
  sm: "h-9 gap-1.5 rounded-xl px-3 text-sm",
  md: "h-11 gap-2 rounded-2xl px-4 text-sm",
  /** A thumb's target: answers and trip reports. */
  lg: "h-14 gap-2 rounded-2xl px-5 text-base",
} as const;

/**
 * Connect's buttons, as classes for a `button`, a `Link` or an `a`:
 * rounder and larger than the console's, for a thumb. A `className`
 * given overrides the classes it clashes with.
 */
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
    "inline-flex items-center justify-center font-semibold whitespace-nowrap transition select-none [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
