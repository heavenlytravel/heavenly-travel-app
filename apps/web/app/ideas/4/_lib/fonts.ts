import { Chivo, Chivo_Mono, Hepta_Slab } from "next/font/google";

/** Hepta Slab for times and headlines: light at huge sizes, 600 to 700 for heads. */
export const slab = Hepta_Slab({
  subsets: ["latin"],
  variable: "--font-slab",
  display: "swap",
});

/** Chivo for running text. */
export const text = Chivo({
  subsets: ["latin"],
  variable: "--font-text",
  display: "swap",
});

/** Chivo Mono for the hour rail, table figures and small labels. */
export const mono = Chivo_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVars = `${slab.variable} ${text.variable} ${mono.variable}`;
