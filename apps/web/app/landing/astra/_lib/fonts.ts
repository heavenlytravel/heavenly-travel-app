import { DM_Sans, DM_Serif_Display, Oooh_Baby } from "next/font/google";

/**
 * The GPT Astra concept's own type: DM Serif Display for headlines, DM Sans for
 * everything else and Oooh Baby for the handwritten accents. It keeps the
 * variable names of the other landing designs so shared pieces pick it up.
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

const script = Oooh_Baby({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export const fontVars = `${display.variable} ${body.variable} ${script.variable}`;
