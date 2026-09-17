import {
  Archivo,
  Barlow,
  Barlow_Condensed,
  Besley,
  Chivo,
  DM_Sans,
  Encode_Sans_Condensed,
  Figtree,
  Hepta_Slab,
  Karla,
  Libre_Caslon_Text,
  Literata,
  Manrope,
  Mukta,
  Overpass,
  Spline_Sans_Mono,
  Young_Serif,
} from "next/font/google";
import type { FontKey } from "../_lib/designs";

/** Preview faces for the design summaries on /landing and /ideas. */

const overpass = Overpass({
  subsets: ["latin"],
  weight: ["400", "900"],
  display: "swap",
});
const literata = Literata({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const figtree = Figtree({ subsets: ["latin"], display: "swap" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});
const barlow = Barlow({ subsets: ["latin"], weight: ["400"], display: "swap" });
const manrope = Manrope({ subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap" });
const mukta = Mukta({ subsets: ["latin"], weight: ["700"], display: "swap" });
const karla = Karla({ subsets: ["latin"], display: "swap" });
const besley = Besley({ subsets: ["latin"], display: "swap" });
const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  display: "swap",
});
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});
const encodeSansCondensed = Encode_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const libreCaslonText = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const heptaSlab = Hepta_Slab({ subsets: ["latin"], display: "swap" });
const chivo = Chivo({ subsets: ["latin"], display: "swap" });

export const FONT_CLASS: Record<FontKey, string> = {
  overpass: overpass.className,
  literata: literata.className,
  youngSerif: youngSerif.className,
  figtree: figtree.className,
  barlowCondensed: barlowCondensed.className,
  barlow: barlow.className,
  manrope: manrope.className,
  dmSans: dmSans.className,
  mukta: mukta.className,
  karla: karla.className,
  besley: besley.className,
  splineSansMono: splineSansMono.className,
  archivo: archivo.className,
  archivoExpanded: `${archivo.className} font-extrabold [font-stretch:125%]`,
  encodeSansCondensed: encodeSansCondensed.className,
  libreCaslonText: libreCaslonText.className,
  heptaSlab: heptaSlab.className,
  chivo: chivo.className,
};
