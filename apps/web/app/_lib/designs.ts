/**
 * Short design summary for each landing page variation, read from each
 * variation's page.tsx and CSS module. Used by /landing so the six
 * options can be compared and mixed.
 */

export type Swatch = { hex: string; name: string; role: string };

export type FontKey =
  | "overpass"
  | "literata"
  | "archivo"
  | "youngSerif"
  | "figtree"
  | "newsreader"
  | "plusJakarta"
  | "barlowCondensed"
  | "barlow"
  | "manrope"
  | "dmSans"
  | "mukta"
  | "karla";

export type FontUse = { key: FontKey; family: string; note: string };

export type Design = {
  label: string;
  palette: Swatch[];
  display: FontUse;
  body: FontUse;
  hero: string;
  imagery: string;
  shape: string;
  motion: string;
  voice: string;
  lift: string;
};

export const DESIGNS: Record<string, Design> = {
  "/landing/opus/1": {
    label: "Road-sign plate",
    palette: [
      {
        hex: "#0D3B40",
        name: "Andaman deep",
        role: "dark panels, sign plates",
      },
      { hex: "#F2B33D", name: "Sunset amber", role: "buttons, region labels" },
      {
        hex: "#9C4A22",
        name: "Kite terracotta",
        role: "hover links, bullets, focus",
      },
      {
        hex: "#2E5E4E",
        name: "Mangrove",
        role: "subtitles, dashed road lines",
      },
      { hex: "#EEF0EA", name: "Limestone", role: "page background" },
    ],
    display: {
      key: "overpass",
      family: "Overpass",
      note: "weight 900, tight tracking",
    },
    body: {
      key: "literata",
      family: "Literata",
      note: "serif body, italic captions",
    },
    hero: "Dark sign plate with a white inset ring over a kite photo; search bar is a second plate.",
    imagery: "2 photos, drawn coach and car on dashed road lines.",
    shape:
      "Very rounded, 16 to 28px, pill buttons. No drop shadows; inset rings instead.",
    motion: "Direction-board lines grow and dots pop in sequence.",
    voice: "'Wherever you are. Wherever you're going.' Plain, no hype.",
    lift: "The sign-plate container and the amber-on-teal pairing.",
  },
  "/landing/opus/2": {
    label: "Coach livery",
    palette: [
      {
        hex: "#0E3A2F",
        name: "Bottle green",
        role: "header, hero, quote band",
      },
      {
        hex: "#C49A3C",
        name: "Brass",
        role: "buttons, pinstripe, rules, focus",
      },
      { hex: "#0A2A22", name: "Ink green", role: "text, footer" },
      { hex: "#EEF1EE", name: "Chassis", role: "page background" },
      { hex: "#FFFFFF", name: "Paper", role: "trip sheet, search bar" },
    ],
    display: {
      key: "archivo",
      family: "Archivo, width 125",
      note: "widened 'livery lettering'",
    },
    body: {
      key: "archivo",
      family: "Archivo, width 100",
      note: "same family, normal width",
    },
    hero: "Green panel with a coach photo and a white 'pickup is confirmed' trip sheet pinned on it.",
    imagery: "4 photos only. No drawings.",
    shape:
      "Near-sharp, 3 to 6px. Hairline rules and brass top rules instead of boxes. Two soft shadows.",
    motion: "Brass pinstripe wipes in across the green stripe.",
    voice:
      "'Nothing is booked until you confirm a written quote.' Formal and operational.",
    lift: "The trip-sheet card and the green-and-brass pinstripe.",
  },
  "/landing/opus/3": {
    label: "Expressway signage",
    palette: [
      {
        hex: "#00573F",
        name: "Expressway green",
        role: "sign panels, footer, buttons",
      },
      {
        hex: "#FFC72C",
        name: "Sign yellow",
        role: "route shields, road dashes, CTA",
      },
      { hex: "#263033", name: "Asphalt", role: "text, road, dark section" },
      {
        hex: "#0B5E8E",
        name: "State-road blue",
        role: "East Coast branch, focus",
      },
      { hex: "#E3ECE6", name: "Mist", role: "page background" },
    ],
    display: {
      key: "overpass",
      family: "Overpass",
      note: "weight 900, Highway Gothic feel",
    },
    body: {
      key: "overpass",
      family: "Overpass",
      note: "single family throughout",
    },
    hero: "Tilted green direction sign on posts; the search form reuses the same sign shell.",
    imagery: "No photos. Roads, shields, coach and car are CSS and SVG.",
    shape:
      "Sign panels 18px with a 3px white inset border, pill buttons, thick borders. One shadow.",
    motion: "Sign rows slide in one by one.",
    voice:
      "'Booking takes three messages.' Route codes E1, E2, E8 add local flavour.",
    lift: "The CSS road and yellow route shields; works with no photography.",
  },
  "/landing/fable/1": {
    label: "Island host",
    palette: [
      { hex: "#0C3B3A", name: "Sea deep", role: "header, hero, quote band" },
      { hex: "#E4A93C", name: "Gold", role: "buttons, map routes, focus" },
      { hex: "#157A74", name: "Sea", role: "links, ticks, step numerals" },
      { hex: "#F2E8D5", name: "Sand", role: "story section" },
      { hex: "#E8F2EF", name: "Foam", role: "coverage section, fields" },
    ],
    display: {
      key: "youngSerif",
      family: "Young Serif",
      note: "single weight, chunky",
    },
    body: {
      key: "figtree",
      family: "Figtree",
      note: "friendly geometric sans",
    },
    hero: "Headline beside a hand-drawn Malaysia network map; a white search card overlaps the hero edge.",
    imagery: "5 photos plus the animated SVG map.",
    shape:
      "Soft rectangles, 6 to 12px. Hairlines only; one teal-tinted shadow on the search card.",
    motion: "Map routes draw out from Langkawi, then pins appear.",
    voice: "'Local knowledge, wherever you land.' Warm and a little wry.",
    lift: "The animated map and the sand-and-foam surfaces.",
  },
  "/landing/fable/2": {
    label: "Operator's trip sheet",
    palette: [
      { hex: "#0D3B3E", name: "Ink teal", role: "hero, headings, quote band" },
      { hex: "#E0A23A", name: "Lantern", role: "buttons, stop dots, focus" },
      { hex: "#1F7A7A", name: "Sea", role: "links, ticks" },
      { hex: "#EEF2EF", name: "Mist", role: "page background, cards" },
      { hex: "#E4DFD3", name: "Sand", role: "'Coming next' card" },
    ],
    display: {
      key: "newsreader",
      family: "Newsreader",
      note: "weight 500, editorial serif",
    },
    body: {
      key: "plusJakarta",
      family: "Plus Jakarta Sans",
      note: "clean sans at 17px",
    },
    hero: "Coach photo with a 'Sample trip sheet' card overlapping it; search bar straddles the hero edge.",
    imagery: "5 photos only. Route timeline is CSS.",
    shape:
      "Rounded, 8 to 16px, pill buttons. Label-column grid. Two long soft shadows.",
    motion: "Trip sheet settles onto the photo.",
    voice: "'We arrive early, not on time.' Honest and operational.",
    lift: "The fleet table and the label-column layout.",
  },
  "/landing/fable/3": {
    label: "Road network",
    palette: [
      { hex: "#0C2340", name: "Navy ink", role: "text, dark bands, map roads" },
      {
        hex: "#F5B800",
        name: "Road yellow",
        role: "buttons, ticks, road marking",
      },
      { hex: "#1E6B4A", name: "Forest", role: "car card, nav hover" },
      { hex: "#E4EDE6", name: "Sage", role: "'Why us' section, map land" },
      { hex: "#F3F7FA", name: "Sky", role: "page background" },
    ],
    display: {
      key: "barlowCondensed",
      family: "Barlow Condensed",
      note: "very large, tight leading",
    },
    body: { key: "barlow", family: "Barlow", note: "matching sans" },
    hero: "Huge condensed headline over a dashed road rule, beside a map whose roads draw themselves.",
    imagery: "3 photos plus the animated SVG map.",
    shape:
      "Cards 16px, buttons 6px, no pills. Hairline rings; one shadow on the search bar.",
    motion: "West road draws, then east road, then place labels fade in.",
    voice: "'Journeys we drive every week.' Confident, transport-first.",
    lift: "The route board and the navy-plus-yellow road stroke.",
  },
};

/** External pages summarised the same way, for comparison. */
export type Reference = {
  name: string;
  by: string;
  href: string;
  design: Design;
};

export const REFERENCES: Reference[] = [
  {
    name: "Codex concept",
    by: "Built by the CEO with Codex",
    href: "https://heavenly-travel-design.xv4cg9ph6y.chatgpt.site/",
    design: {
      label: "Package finder",
      palette: [
        { hex: "#087D82", name: "Teal", role: "buttons, active tab, links" },
        { hex: "#153C43", name: "Ink", role: "text, review bar" },
        { hex: "#16464D", name: "Hero teal", role: "hero scrim, footer" },
        { hex: "#EDF6F6", name: "Pale", role: "hover surfaces" },
        { hex: "#FFBC66", name: "Orange", role: "small accent" },
      ],
      display: {
        key: "manrope",
        family: "Manrope",
        note: "weight 750, -0.04em tracking",
      },
      body: { key: "dmSans", family: "DM Sans", note: "16px, 1.65 leading" },
      hero: "Langkawi photo in a 16px-rounded card with a teal gradient; a white finder card with six service tabs overlaps it.",
      imagery:
        "Photos only (Langkawi, KL, Bali, coaches) plus thin line icons.",
      shape:
        "8 to 12px corners, hairline borders, one soft shadow. Card images zoom on hover.",
      motion:
        "Hover only: buttons lift 1px, images scale. Reduced-motion honoured.",
      voice:
        "'Your next chapter starts here.' 'Big plans. One point of contact.' Same headline as the six options.",
      lift: "The service-tab finder card and the package cards with price and inclusions.",
    },
  },
  {
    name: "Current site",
    by: "WordPress with Astra and Elementor",
    href: "https://heavenlytravel.my/",
    design: {
      label: "WordPress agency page",
      palette: [
        { hex: "#00264B", name: "Navy", role: "headings, text, dark sections" },
        { hex: "#046BD2", name: "Blue", role: "theme primary, links" },
        { hex: "#017AC3", name: "Button blue", role: "the one button" },
        { hex: "#F0F5FF", name: "Pale blue", role: "section background" },
        { hex: "#FFFFFF", name: "White", role: "page background" },
      ],
      display: { key: "mukta", family: "Mukta", note: "weight 700" },
      body: { key: "karla", family: "Karla", note: "weight 400" },
      hero: "Full-width photo with the long headline 'Unlock Unforgettable Journeys: Your Trusted Travel Agency in Langkawi Awaits!' No search or booking control.",
      imagery:
        "Service and attraction photos, a wall of 30+ client logos and three registration badges.",
      shape:
        "15px card corners, 50px pill button, one soft blue shadow. Theme defaults.",
      motion: "None.",
      voice:
        "SEO-led: 'Our Services', 'Featured Tour Packages', 'What Our Customers Say'. Tagline 'Your Travel Engineer'.",
      lift: "The client logo wall and registration badges; real trust proof none of the concepts have.",
    },
  },
];
