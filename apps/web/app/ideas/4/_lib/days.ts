/**
 * The four day templates on /ideas/4. Each is a run sheet: timed stops, the
 * drive that reaches each stop, and the times at which the company's own
 * story is slotted between them.
 *
 * Two rules keep the sky readable (see sky.ts): interlude times must not
 * collide with stop times, and no stop sits between GOLDEN_AT and DUSK_AT,
 * where the page carries the golden-hour photograph and no text.
 */

import type { PlaceId } from "../../../_lib/routes";
import type { ServiceKey } from "../../../_lib/trip";
import { DAY_END, DAY_START, DUSK_AT, GOLDEN_AT, toMinutes } from "./sky";

export type Photo = { src: string; alt: string; caption: string };

/** How the vehicle reaches a stop: between two towns, or a short local hop. */
export type Leg =
  | { kind: "road"; from: PlaceId; to: PlaceId }
  | { kind: "local"; minutes: number };

export type Stop = {
  time: string;
  title: string;
  detail: string;
  /** A short line in mono under the detail: a ticket, a count, a caveat. */
  note?: string;
  leg?: Leg;
  photo?: Photo;
};

export type InterludeId =
  "driver" | "vehicle" | "included" | "services" | "golden" | "reviews";

export type DayId = "langkawi" | "kl" | "cameron" | "coach";

export type DayTemplate = {
  id: DayId;
  title: string;
  summary: string;
  vehicleHint: string;
  service: Extract<ServiceKey, "tour" | "coach">;
  passengers: number;
  from: string;
  to: string;
  stops: Stop[];
  /** When each part of the company story appears. Golden hour is fixed. */
  interludes: Record<Exclude<InterludeId, "golden">, string>;
  goldenCaption: string;
};

const PICK_UP_CABIN = {
  src: "/brand/chauffeur.jpg",
  alt: "The leather cabin of a chauffeur-driven MPV",
};

const LANGKAWI: DayTemplate = {
  id: "langkawi",
  title: "Langkawi island day",
  summary:
    "Airport at 09:10, Eagle Square, the cable car, lunch at Cenang, mangroves, sunset at Tanjung Rhu.",
  vehicleHint: "Car with driver",
  service: "tour",
  passengers: 4,
  from: "Langkawi International Airport",
  to: "Your hotel, Pantai Cenang",
  interludes: {
    driver: "08:40",
    vehicle: "10:15",
    included: "13:20",
    services: "15:45",
    reviews: "20:30",
  },
  goldenCaption:
    "18:30, from above the cable car station. You were standing on that deck at eleven.",
  stops: [
    {
      time: "09:10",
      title: "Langkawi airport, arrivals",
      detail:
        "Your flight lands. The driver has been in the hall since 08:40 with your name on a board. Bags in the back, cold water in the door, and nobody asks you for directions.",
      note: "Name board. Flight tracked from take-off.",
      photo: {
        ...PICK_UP_CABIN,
        caption: "09:14. The cabin you will spend the day in.",
      },
    },
    {
      time: "09:45",
      title: "Eagle Square, Kuah",
      detail:
        "Dataran Lang before the tour buses arrive. Twenty minutes is enough. The eagle does not move.",
      leg: { kind: "local", minutes: 30 },
      photo: {
        src: "/brand/hero-langkawi.jpg",
        alt: "Eagle Square in Langkawi seen from the air, the eagle statue facing the sea",
        caption: "09:45. Eagle Square, still quiet.",
      },
    },
    {
      time: "10:50",
      title: "Cable car and Sky Bridge",
      detail:
        "Tickets are already on your booking, so you walk past the queue. Up to 708 metres, across the bridge, down when you are ready. The driver waits at Oriental Village and does not look at his watch.",
      note: "SkyCab and Sky Bridge tickets added to the transfer.",
      leg: { kind: "local", minutes: 45 },
      photo: {
        src: "/brand/cable-car.jpg",
        alt: "Langkawi cable car gondolas rising through mist towards the top station",
        caption: "11:05. Mist is normal. It clears, usually.",
      },
    },
    {
      time: "13:00",
      title: "Lunch, Pantai Cenang",
      detail:
        "He will suggest a place for ikan bakar if you ask, and keep quiet if you do not. Take the hour. The car is parked in the shade and so is he.",
      leg: { kind: "local", minutes: 25 },
    },
    {
      time: "14:45",
      title: "Kilim mangroves",
      detail:
        "A boat through the geoforest park: eagles, limestone, a cave full of bats. About two hours on the water. The boat can go on the same booking as the car.",
      note: "Mangrove cruise tickets on request.",
      leg: { kind: "local", minutes: 45 },
    },
    {
      time: "17:45",
      title: "Tanjung Rhu, for the sunset",
      detail:
        "The quiet end of the island. Tide out, sandbars showing, nobody selling anything. He knows where to park so you walk two minutes, not twenty.",
      leg: { kind: "local", minutes: 15 },
    },
    {
      time: "19:50",
      title: "Your hotel, Pantai Cenang",
      detail:
        "Dropped at the lobby with everything you arrived with. Tomorrow's pick-up time is agreed before he leaves.",
      leg: { kind: "local", minutes: 40 },
    },
  ],
};

const KL: DayTemplate = {
  id: "kl",
  title: "KLIA to Kuala Lumpur city day",
  summary:
    "Land at 08:20, bags to the hotel, Batu Caves, Merdeka Square, the towers, dinner on Jalan Alor.",
  vehicleHint: "Car with driver",
  service: "tour",
  passengers: 2,
  from: "KLIA Terminal 1, arrivals",
  to: "Your hotel, Kuala Lumpur city centre",
  interludes: {
    driver: "07:50",
    vehicle: "09:40",
    included: "13:20",
    services: "15:50",
    reviews: "20:40",
  },
  goldenCaption:
    "18:30 in Langkawi, where we are based. A different day, if you want one tomorrow.",
  stops: [
    {
      time: "08:20",
      title: "KLIA Terminal 1, arrivals",
      detail:
        "Through immigration and out. The board with your name is at the rail opposite the doors. If the flight is late, the pick-up moves with it.",
      note: "Name board. Flight tracked from take-off.",
      photo: {
        ...PICK_UP_CABIN,
        caption: "08:35. Seats back. It is an hour to the city.",
      },
    },
    {
      time: "09:30",
      title: "Your hotel, bags only",
      detail:
        "Too early to check in, so the bags go to the concierge and you keep the car.",
      leg: { kind: "road", from: "klia", to: "kl" },
    },
    {
      time: "10:15",
      title: "Batu Caves",
      detail:
        "272 steps, best before the heat. He parks. You climb. Mind the monkeys; they know what a plastic bag sounds like.",
      leg: { kind: "local", minutes: 25 },
    },
    {
      time: "12:00",
      title: "Merdeka Square and the river",
      detail:
        "Dataran Merdeka, Masjid Jamek, the River of Life walk. He drops you at one end and collects you at the other.",
      leg: { kind: "local", minutes: 30 },
    },
    {
      time: "13:00",
      title: "Lunch, Kampung Baru",
      detail:
        "Nasi lemak under the towers, in the last village in the city centre. Take the hour.",
      leg: { kind: "local", minutes: 15 },
    },
    {
      time: "15:00",
      title: "KLCC and the Petronas Towers",
      detail:
        "Skybridge tickets are timed, so this stop is fixed and the rest of the day bends around it.",
      note: "Book tower tickets ahead. We plan around your slot.",
      leg: { kind: "local", minutes: 10 },
    },
    {
      time: "17:30",
      title: "Thean Hou Temple",
      detail:
        "On its hill above the city, for the evening light. The traffic at this hour is his problem, not yours.",
      leg: { kind: "local", minutes: 25 },
    },
    {
      time: "19:45",
      title: "Dinner, Jalan Alor",
      detail:
        "Dropped at the top of the street. Message when you are done. He is ten minutes away, not circling.",
      leg: { kind: "local", minutes: 30 },
    },
    {
      time: "21:30",
      title: "Your hotel, Kuala Lumpur",
      detail:
        "Bags are already in the room. That is thirteen hours, door to door, and you did not read a map once.",
      leg: { kind: "local", minutes: 15 },
    },
  ],
};

const CAMERON: DayTemplate = {
  id: "cameron",
  title: "Penang to Cameron Highlands",
  summary:
    "Family MPV from George Town at 07:30, white coffee in Ipoh, tea estates by noon, scones at four.",
  vehicleHint: "Family MPV, 6 seats",
  service: "tour",
  passengers: 5,
  from: "Your hotel, George Town, Penang",
  to: "Your hotel, Tanah Rata, Cameron Highlands",
  interludes: {
    driver: "07:00",
    vehicle: "08:30",
    included: "13:35",
    services: "15:30",
    reviews: "20:30",
  },
  goldenCaption:
    "18:30 in Langkawi, where we are based. A different day, if you want one next.",
  stops: [
    {
      time: "07:30",
      title: "Hotel lobby, George Town",
      detail:
        "Six seats, five of you, bags in the back. If you asked for a child seat it is fitted before he arrives, not while you watch.",
      note: "Child seat on request.",
      photo: {
        src: "/brand/mpv.jpg",
        alt: "A line of black and white MPVs parked by the sea under palm trees",
        caption: "07:25. One of these, five minutes early.",
      },
    },
    {
      time: "09:40",
      title: "Ipoh old town",
      detail:
        "White coffee and kaya toast. Forty minutes. The road ahead is better on a full stomach.",
      leg: { kind: "road", from: "penang", to: "ipoh" },
    },
    {
      time: "12:05",
      title: "BOH Sungai Palas tea estate",
      detail:
        "Up by Simpang Pulai, the wider road, driven slowly. Tea terraces to the horizon and a pot of what grows on them.",
      note: "The estate closes on Mondays. We check your date before we quote.",
      leg: { kind: "road", from: "ipoh", to: "cameron" },
    },
    {
      time: "13:15",
      title: "Lunch, Brinchang",
      detail:
        "Steamboat if it is cold enough, and it usually is. Take the hour.",
      leg: { kind: "local", minutes: 20 },
    },
    {
      time: "14:45",
      title: "Strawberries and the market, Kea Farm",
      detail:
        "Pick your own, then the roadside market for sweetcorn and honey. The boot has room. He has seen it filled before.",
      leg: { kind: "local", minutes: 10 },
    },
    {
      time: "16:30",
      title: "Tea and scones, Tanah Rata",
      detail: "A colonial habit that has outlived the colony. Jam is local.",
      leg: { kind: "local", minutes: 20 },
    },
    {
      time: "17:45",
      title: "Hotel check-in, Tanah Rata",
      detail:
        "Bags up to the room. The driver stays in the highlands tonight and is yours again at nine.",
      leg: { kind: "local", minutes: 5 },
    },
    {
      time: "19:45",
      title: "Dinner, on foot",
      detail:
        "Tanah Rata is one street. He is off duty, and after the bends, he has earned it.",
    },
  ],
};

const COACH: DayTemplate = {
  id: "coach",
  title: "Company retreat or school trip",
  summary:
    "44-seat coach, Kuala Lumpur to Melaka and back. Three headcounts, two comfort stops, one restaurant.",
  vehicleHint: "Executive coach, 44 seats",
  service: "coach",
  passengers: 40,
  from: "Your office or school, Kuala Lumpur",
  to: "Melaka and back to Kuala Lumpur",
  interludes: {
    driver: "06:50",
    vehicle: "08:05",
    included: "13:10",
    services: "15:15",
    reviews: "20:15",
  },
  goldenCaption:
    "18:30 in Langkawi, where we are based. The coaches are just as punctual up there.",
  stops: [
    {
      time: "07:20",
      title: "Coach at your door, Kuala Lumpur",
      detail:
        "Ten minutes early, hazard lights on, luggage bay open. Your coordinator has had the driver's name and number since yesterday.",
      note: "Permits and driver licences sent before the trip.",
      photo: {
        src: "/brand/coach.jpg",
        alt: "A fleet of green and white executive coaches parked in a row",
        caption: "07:20. Yours is the one with the door open.",
      },
    },
    {
      time: "07:30",
      title: "Headcount one",
      detail:
        "40 on the list, 40 on board. We count every time the doors close. It is dull and it works.",
      note: "40 / 40",
    },
    {
      time: "08:40",
      title: "Comfort stop, Seremban R&R",
      detail:
        "Fifteen minutes. There is a toilet on board as well, for the optimists.",
      leg: { kind: "local", minutes: 65 },
    },
    {
      time: "09:50",
      title: "Dutch Square, Melaka",
      detail:
        "The coach parks once and the old town is done on foot: the Stadthuys, Christ Church, up the hill to St Paul's and down to A Famosa.",
      leg: { kind: "road", from: "kl", to: "melaka" },
    },
    {
      time: "12:30",
      title: "Lunch for forty",
      detail:
        "One restaurant, pre-ordered, halal, tables of ten. Nobody queues and nobody is asked what they want. Headcount two on the way out.",
      note: "40 / 40",
      leg: { kind: "local", minutes: 10 },
    },
    {
      time: "14:30",
      title: "Team session, or Jonker Street",
      detail:
        "Your programme, not ours. The coach is parked five minutes away with the aircon ready for half past four.",
    },
    {
      time: "16:30",
      title: "Headcount three, depart Melaka",
      detail:
        "The two who are always late are late. We allowed for them when we wrote this sheet.",
      note: "38 / 40, then 40 / 40",
    },
    {
      time: "17:40",
      title: "Comfort stop, Seremban R&R",
      detail: "Fifteen minutes again. Most of the coach is asleep.",
      leg: { kind: "local", minutes: 65 },
    },
    {
      time: "19:35",
      title: "Back at your door, Kuala Lumpur",
      detail:
        "Evening traffic into the city was in the plan. Everyone off, seats checked for phones, and the coordinator signs nothing because there is nothing to dispute.",
      leg: { kind: "local", minutes: 95 },
    },
  ],
};

export const DAYS: readonly DayTemplate[] = [LANGKAWI, KL, CAMERON, COACH];

export const DEFAULT_DAY = LANGKAWI;

export function dayById(id: DayId): DayTemplate {
  return DAYS.find((d) => d.id === id) ?? DEFAULT_DAY;
}

export type SheetEntry =
  | { kind: "stop"; minutes: number; stop: Stop }
  | { kind: "interlude"; minutes: number; id: InterludeId };

/** Stops and interludes merged into one day, in the order the clock runs. */
export function sheetFor(day: DayTemplate): SheetEntry[] {
  const stops: SheetEntry[] = day.stops.map((stop) => ({
    kind: "stop",
    minutes: toMinutes(stop.time),
    stop,
  }));
  const interludes: SheetEntry[] = (
    Object.entries(day.interludes) as [InterludeId, string][]
  ).map(([id, time]) => ({ kind: "interlude", minutes: toMinutes(time), id }));
  return [
    ...stops,
    ...interludes,
    { kind: "interlude" as const, minutes: GOLDEN_AT, id: "golden" as const },
  ].sort((a, b) => a.minutes - b.minutes);
}

/**
 * The minutes at which each entry's stretch of sky begins. Whatever follows
 * golden hour starts at dusk, because the photograph has already spent the
 * minutes in between.
 */
export function sheetBounds(entries: readonly SheetEntry[]) {
  const first = entries[0]?.minutes ?? DAY_START;
  const start = (DAY_START + first) / 2;
  const edges = entries.map((entry, i) => {
    const previous = entries[i - 1];
    if (!previous) return start;
    const halfway = (previous.minutes + entry.minutes) / 2;
    return previous.minutes >= GOLDEN_AT ? Math.max(halfway, DUSK_AT) : halfway;
  });
  const last = entries[entries.length - 1]?.minutes ?? DAY_END;
  const end = Math.max((last + DAY_END) / 2, DUSK_AT);
  return { start, edges: [...edges, end], end };
}
