import { DM_Sans, DM_Serif_Display } from "next/font/google";

/**
 * The console's type, as manage loads it: DM Serif Display for the band's
 * titles and the large figures, DM Sans for everything else. The tokens
 * make them `font-serif` and `font-sans`, and Clerk's headings read
 * `--font-display` too.
 */
const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const fontVars = `${display.variable} ${body.variable}`;
