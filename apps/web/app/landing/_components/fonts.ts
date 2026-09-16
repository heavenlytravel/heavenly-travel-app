import {
  Archivo,
  Barlow,
  Barlow_Condensed,
  DM_Sans,
  Figtree,
  Karla,
  Literata,
  Manrope,
  Mukta,
  Newsreader,
  Overpass,
  Plus_Jakarta_Sans,
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
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});
const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const figtree = Figtree({ subsets: ["latin"], display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
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
  archivo: archivo.className,
  youngSerif: youngSerif.className,
  figtree: figtree.className,
  newsreader: newsreader.className,
  plusJakarta: plusJakarta.className,
  barlowCondensed: barlowCondensed.className,
  barlow: barlow.className,
  manrope: manrope.className,
  dmSans: dmSans.className,
  mukta: mukta.className,
  karla: karla.className,
};
