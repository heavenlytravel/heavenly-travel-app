/** Class strings shared by the server page and the client components. */

export const focusInk =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#141414]";
export const focusBone =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#F7F4EC]";

/** Small uppercase label used above every figure on the page. */
export const eyebrow =
  "text-[0.6875rem] font-semibold tracking-[0.14em] uppercase";

/** Ink text on vermilion is 4.6:1; white would only reach 4.0:1. */
export const primaryButton = `inline-flex items-center justify-center gap-2 rounded-md border-2 border-[#141414] bg-[#E8442A] px-5 py-3 text-[0.9375rem] font-bold text-[#141414] hover:bg-[#141414] hover:text-[#F7F4EC] ${focusInk}`;

export const quietButton =
  "inline-flex items-center justify-center gap-2 rounded-md border-2 border-current px-3.5 py-2 text-sm font-semibold";
