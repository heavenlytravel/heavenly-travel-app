import {
  Barlow,
  Barlow_Condensed,
  DM_Sans,
  Figtree,
  Karla,
  Literata,
  Manrope,
  Mukta,
  Overpass,
  Young_Serif,
} from "next/font/google";
import type { FontKey } from "../../_lib/designs";

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
};
