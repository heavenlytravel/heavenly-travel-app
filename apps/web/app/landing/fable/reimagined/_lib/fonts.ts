import { Figtree, Overpass } from "next/font/google";

/** Overpass for display type, Figtree for body, on all four reimagined pages. */
export const display = Overpass({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

export const body = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const fontVars = `${display.variable} ${body.variable}`;
