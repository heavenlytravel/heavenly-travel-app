import { Besley, Spline_Sans_Mono } from "next/font/google";

/** Besley writes the customer's letter; Spline Sans Mono is our reply. */
export const serif = Besley({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-letter",
  display: "swap",
});

export const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-reply",
  display: "swap",
});

export const fontVars = `${serif.variable} ${mono.variable}`;
