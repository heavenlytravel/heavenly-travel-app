import { Encode_Sans_Condensed, Libre_Caslon_Text } from "next/font/google";

/** Labels, chart figures, place names and headlines. */
export const sans = Encode_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Captions, the standfirst and notes from the road. Libre Caslon Text has no
 * bold italic, so the upright and italic cuts are loaded separately.
 */
export const serif = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal"],
  variable: "--font-serif",
  display: "swap",
});

export const serifItalic = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-serif-italic",
  display: "swap",
});

export const fontVars = `${sans.variable} ${serif.variable} ${serifItalic.variable}`;
