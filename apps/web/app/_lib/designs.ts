/**
 * Short design summary for each landing page variation and each idea, read
 * from the page's page.tsx and CSS module. Used by /landing and /ideas so the
 * options can be compared and mixed.
 */

import { IDEAS } from "./ideas";
import { VARIATIONS } from "./variations";

export type Swatch = { hex: string; name: string; role: string };

export type FontKey =
  | "overpass"
  | "literata"
  | "youngSerif"
  | "figtree"
  | "barlowCondensed"
  | "barlow"
  | "manrope"
  | "dmSans"
  | "mukta"
  | "karla"
  | "besley"
  | "splineSansMono"
  | "archivo"
  | "archivoExpanded"
  | "encodeSansCondensed"
  | "libreCaslonText"
  | "heptaSlab"
  | "chivo";

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
  "/landing/opus/3": {
    label: "Sign plate on the expressway",
    palette: [
      {
        hex: "#0D3B40",
        name: "Andaman deep",
        role: "hero plate, direction board, quote band",
      },
      {
        hex: "#00573F",
        name: "Expressway green",
        role: "coach card, East Coast sign, footer",
      },
      {
        hex: "#F2B33D",
        name: "Sunset amber",
        role: "route shields, road dashes, buttons",
      },
      {
        hex: "#263033",
        name: "Asphalt",
        role: "drawn roads, trust band, text",
      },
      { hex: "#EEF0EA", name: "Limestone", role: "page background" },
    ],
    display: {
      key: "overpass",
      family: "Overpass",
      note: "weight 900, tight tracking, Highway Gothic feel",
    },
    body: {
      key: "literata",
      family: "Literata",
      note: "serif body under a signage display voice",
    },
    hero: "Teal sign plate with a white inset ring over the Dataran Lang aerial; a second plate under it holds the search.",
    imagery:
      "Brand photos (Langkawi aerial, coach line-up, chauffeur MPV, cable car, MICE, MATTA and MoF badges) plus a drawn coach and car on dashed roads.",
    shape:
      "Very rounded 14 to 28px plates with a 3px white inset border, pill buttons, amber route shields, one soft shadow.",
    motion:
      "Direction-board lines grow and dots pop in sequence; 1px hover lifts. Off under reduced motion.",
    voice:
      "'One company for the whole trip.' Route codes E1, E2, E8 and 'Booking takes three messages.'",
    lift: "The sign plate over real photography, and route shields that make any list read as a road sign.",
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
  "/landing/fable/3": {
    label: "Island host on the road",
    palette: [
      {
        hex: "#0C3B3A",
        name: "Sea deep",
        role: "hero scrim, quote band, map pins",
      },
      {
        hex: "#E4A93C",
        name: "Gold",
        role: "buttons, road rule, map roads, focus",
      },
      {
        hex: "#157A74",
        name: "Sea",
        role: "links, step rules, journey times",
      },
      { hex: "#F2E8D5", name: "Sand", role: "story section, inclusions panel" },
      { hex: "#E8F2EF", name: "Foam", role: "journeys board, form fields" },
    ],
    display: {
      key: "overpass",
      family: "Overpass",
      note: "weight 900, -0.02em tracking, 0.96 leading",
    },
    body: {
      key: "figtree",
      family: "Figtree",
      note: "friendly geometric sans, from option 1",
    },
    hero: "Overpass headline over a gold dashed road rule on the scrimmed Langkawi aerial, beside a glass-card network map; a white search card overlaps the hero edge.",
    imagery:
      "7 brand photos (Langkawi aerial, cable car, coaches, MPV interior, LICC) plus MATTA and MoF badges and the animated SVG map. No stock.",
    shape:
      "Cards 16px, buttons 6px, no pills. Hairlines only; one teal-tinted shadow on the search card.",
    motion:
      "Two-layer roads draw outward from Langkawi by hop distance, then pins appear; Borneo follows the peninsula.",
    voice:
      "'Local knowledge, wherever you land' meets 'Journeys we drive every week.' Warm, a little wry, transport-first.",
    lift: "The scrimmed brand photo behind the map card, and the journeys board on foam with gold-on-teal markers.",
  },
  "/ideas/1": {
    label: "A letter, not a form",
    palette: [
      { hex: "#FBFAF4", name: "Paper", role: "page background" },
      { hex: "#1B2B26", name: "Ink", role: "all text, letterhead double rule" },
      {
        hex: "#FFE14D",
        name: "Marker yellow",
        role: "highlighter swipe behind blanks and service names",
      },
      {
        hex: "#2440C8",
        name: "Ballpoint blue",
        role: "the reply, links, focus rings, WhatsApp button",
      },
      { hex: "#D9D6C8", name: "Rule grey", role: "hairlines, margin rule" },
    ],
    display: {
      key: "besley",
      family: "Besley",
      note: "Clarendon-style serif, 500 for the sentence up to 5rem, 800 for the blanks",
    },
    body: {
      key: "splineSansMono",
      family: "Spline Sans Mono",
      note: "the second hand: our reply, sidenotes, labels and figures; prose stays in Besley",
    },
    hero: "No photo and no search card. 'Dear Heavenly Travel,' then one viewport-filling sentence, 'We are [6] people going from [Langkawi] to [Penang] on [a day we'll name], and we'd like [a car with driver].', with the reply in blue mono underneath.",
    imagery:
      "Brand photos as figures, not backdrops: Eagle Square tipped in as Fig. 1, six 72px thumbnails in the sidenotes, the coaches as Fig. 2, MATTA and MOF as sign-off credentials.",
    shape:
      "Square, 2px corners, no shadows, no cards. Hairlines and a double-rule letterhead. Text column with a ruled margin of sidenotes that fall inline on mobile.",
    motion:
      "Marker swipes draw in left to right on load, reply sentences fade in when a blank changes, marked phrases draw on scroll where supported. Off under reduced motion.",
    voice:
      "A letter, plain and a little wry. 'We are a travel agency on an island, which explains a lot.' 'Encl. (5)'. 'Yours on the road,'.",
    lift: "The sentence as the form, with a computed reply: a vehicle, a door-to-door time and a fare before the customer commits to anything.",
  },
  "/ideas/2": {
    label: "One number, one seat plan",
    palette: [
      { hex: "#E9E4D8", name: "Canvas", role: "page, cabin floors" },
      {
        hex: "#141414",
        name: "Ink",
        role: "text, 2px outlines, driver seat, text on vermilion",
      },
      {
        hex: "#E8442A",
        name: "Vermilion",
        role: "taken seats, the numeral, primary button, ladder marker",
      },
      {
        hex: "#1F4F46",
        name: "Coach green",
        role: "vehicle bodies, ladder rail, reviews band, footer",
      },
      {
        hex: "#F7F4EC",
        name: "Bone",
        role: "spare seats, manifest line, active ladder band",
      },
    ],
    display: {
      key: "archivoExpanded",
      family: "Archivo Expanded",
      note: "variable width axis at 125, weight 800 to 900, tabular figures; the numeral runs 12 to 22rem",
    },
    body: {
      key: "archivo",
      family: "Archivo",
      note: "same family at normal width, 400 to 600; no second typeface",
    },
    hero: "Two halves: 'How many of you?' over a giant vermilion numeral with steppers and a 1 to 60 slider, beside a top-down SVG seat plan that fills seat by seat and changes vehicle. A single manifest line below holds from, to, date, fare, drive time and WhatsApp.",
    imagery:
      "Vehicles are drawn, not photographed. Four brand photos in 'Who travels in what', each wider than the last as the group grows from 2 to 44.",
    shape:
      "Flat colour, 2px ink rules, hard edges, 6px radii, rounded-square seats. Grids ruled by gaps instead of cards. No shadows; the only pattern is a hatch for the luggage bay.",
    motion:
      "Newly taken seats fill front to back on a short stagger, the numeral ticks, the plan fades when the vehicle changes. Off under reduced motion.",
    voice:
      "Direct and dry. 'Past 44 we send a second coach.' 'Counted out, counted back.' 'Five vehicles, one ruler.'",
    lift: "The data-driven seat plan as the booking input: one number picks the vehicle, fills the seats, prices the trip and writes the WhatsApp message. The fleet ruler reuses it.",
  },
  "/ideas/3": {
    label: "Road-atlas spread",
    palette: [
      { hex: "#F3F4EE", name: "Sheet", role: "page ground" },
      { hex: "#1C2321", name: "Ink", role: "text, hairline rules" },
      {
        hex: "#1D5FA8",
        name: "Motorway blue",
        role: "selected cell, WhatsApp button, links",
      },
      {
        hex: "#2C7A4B",
        name: "Trunk-road green",
        role: "crosshair tint, highlighted place names, review scores",
      },
      {
        hex: "#C8324B",
        name: "A-road red",
        role: "line from the chosen cell to its two places, step numerals",
      },
    ],
    display: {
      key: "encodeSansCondensed",
      family: "Encode Sans Condensed",
      note: "600 to 700, uppercase with light tracking: map lettering, not signage; tabular figures in the chart",
    },
    body: {
      key: "libreCaslonText",
      family: "Libre Caslon Text",
      note: "standfirst and notes upright; captions, footnotes and reviews in italic, as an atlas sets water",
    },
    hero: "The triangular distance chart from the back of a road atlas: ten places down the diagonal, 45 cells that switch between drive time, kilometres and fare. Pick a cell and the journey panel beside it fills in. Below 700px it becomes From and To selects over a scrolling chart.",
    imagery:
      "Three brand photos as numbered plates with italic captions (Eagle Square, the coaches, the Sky Bridge). Badges in the colophon. No hero photo and no map.",
    shape:
      "Square corners, flat colour, 1px rules, no shadows. A sheet border with grid letters A to H, a scale bar, 'Sheet 1 of 1'. B-road yellow (#F2C230) appears only as the hover cell.",
    motion:
      "Crosshair and place-name tints over 120ms, panel values fade over 180ms. Off under reduced motion.",
    voice:
      "Reference-book dry. 'Find one place on the diagonal, run a finger to the other.' 'Sent in by passengers, printed as received.' Footnotes use daggers.",
    lift: "The chart as a booking control: one click sets origin and destination and shows time, distance and fare for every pair at once. It would work as a 'routes and prices' module on any version of the site.",
  },
  "/ideas/4": {
    label: "The page is a day",
    palette: [
      { hex: "#DDE3EA", name: "Pre-dawn", role: "06:00, the booking control" },
      { hex: "#CFE6F2", name: "Morning", role: "09:00, first stops" },
      { hex: "#F6B66B", name: "Golden hour", role: "18:30, carries the photo" },
      {
        hex: "#101B33",
        name: "Dusk",
        role: "19:30 onward, hour rail, selected day, light text",
      },
      {
        hex: "#D1343E",
        name: "Hibiscus red",
        role: "now-marker, time bullets, primary button",
      },
    ],
    display: {
      key: "heptaSlab",
      family: "Hepta Slab",
      note: "light 300 at huge sizes for times like 09:10, 600 to 700 for headlines: a railway timetable feel",
    },
    body: {
      key: "chivo",
      family: "Chivo",
      note: "running text; Chivo Mono for the hour rail, table figures and small labels",
    },
    hero: "'Book the day, not just the ride.' at 06:00 under a pre-dawn sky, with four day templates as big typographic radio options beside passengers, date and pick-up. A fixed hour rail down the left edge tracks the time you have scrolled to.",
    imagery:
      "Brand photos at the stop they belong to, full width and square-edged: the MPV cabin at pick-up, Eagle Square at 09:45, the cable car at 10:50, a full-bleed photo at golden hour.",
    shape:
      "Flat, square, hairlines, no shadows, no cards. One calm vertical sky gradient is the only gradient; the brown stretch between golden hour and dusk carries a photo and no text, so contrast holds.",
    motion:
      "The now-marker follows scroll and the run sheet fades when the day changes. Off under reduced motion, where the sky is a static gradient.",
    voice:
      "Calm, specific times, a little wry. 'The driver is there before you are.' 'While you eat, he waits.' 'The two who are always late are late. We allowed for them.'",
    lift: "The run sheet: the company's promises told as timed entries in a real day, with the fleet and inclusions set as timetables. It sells punctuality by showing it.",
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

/** One page to summarise: a landing variation, an idea or a reference site. */
export type DesignEntry = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
  design: Design;
};

function withDesign(
  pages: { href: string; title: string; subtitle: string }[],
): DesignEntry[] {
  return pages.flatMap((page) => {
    const design = DESIGNS[page.href];
    return design ? [{ id: page.href, ...page, design }] : [];
  });
}

export const VARIATION_ENTRIES: DesignEntry[] = withDesign(
  VARIATIONS.map((v) => ({
    href: v.href,
    title: `${v.model === "opus" ? "Opus" : "Fable"} ${v.option}`,
    subtitle: v.seed,
  })),
);

export const IDEA_ENTRIES: DesignEntry[] = withDesign(
  IDEAS.map((idea) => ({
    href: idea.href,
    title: `${idea.option}. ${idea.name}`,
    subtitle: idea.control,
  })),
);

export const REFERENCE_ENTRIES: DesignEntry[] = REFERENCES.map((r) => ({
  id: r.href,
  title: r.name,
  subtitle: r.by,
  href: r.href,
  external: true,
  design: r.design,
}));
