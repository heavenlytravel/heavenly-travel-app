import { Archivo } from "next/font/google";

/**
 * One family, two widths. Archivo is loaded as a variable font with the
 * width axis, so headlines and numerals can run expanded (wdth 125) while
 * body text stays at normal width. Weight is left variable.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
