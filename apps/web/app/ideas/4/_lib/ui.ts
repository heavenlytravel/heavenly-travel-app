/** Class fragments repeated across the components of /ideas/4. */

export const slabFont = "font-(family-name:--font-slab)";

export const monoFont = "font-(family-name:--font-mono) tabular-nums";

/** Small uppercase mono label: rail figures, table heads, eyebrows. */
export const label = `${monoFont} text-[12px] uppercase tracking-[0.14em]`;

/** The outline follows the text colour, so it holds on every sky. */
export const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--fg)";

/** Red is never text here (it fails AA on the pale skies), only the underline. */
export const link = `underline decoration-(--signal) decoration-2 underline-offset-4 hover:decoration-(--fg) ${focusRing}`;

/** Primary button: white on hibiscus red, 4.9:1. */
export const primaryButton = `inline-flex min-h-13 items-center justify-center gap-2.5 bg-(--signal) px-6 py-3 text-[16px] font-semibold text-white hover:bg-[#b32a33] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--fg)`;
