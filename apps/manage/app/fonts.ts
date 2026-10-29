import { DM_Sans, DM_Serif_Display } from "next/font/google";

/**
 * The console's type, the customer site's own pair: DM Serif Display for
 * page titles, figures and the dashboard's greeting, DM Sans for
 * everything else. `globals.css` makes them `font-serif` and `font-sans`,
 * and Clerk's headings read `--font-display` too.
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
