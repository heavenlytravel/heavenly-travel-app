import type { TripCategory } from "@repo/db";
import { addDays, classOf } from "./data";
import {
  ACCOUNT,
  blankRow,
  freshState,
  newId,
  type ChosenVehicle,
  type ExampleState,
  type SearchRow,
  type Trip,
  type Vehicle,
} from "./store";

/**
 * Every booking situation the example can show, each a starting state and
 * the step it opens on, in groups by what the booking is, not by how it
 * was typed: a return is two one-way trips, each added on its own.
 * Dates are fixed in November 2026, except the trip that is too soon to
 * book, which starts three hours from now.
 */

export type Step = "search" | "vehicle" | "confirm" | "received" | "booking";

export const STEP_PATHS: Record<Step, string> = {
  search: "/booking-example/search",
  vehicle: "/booking-example/vehicle",
  confirm: "/booking-example/confirm",
  received: "/booking-example/received",
  booking: "/booking-example/booking",
};

export type Situation = {
  id: string;
  title: string;
  text: string;
  step: Step;
  load: () => ExampleState;
};

export type SituationGroup = {
  title: string;
  text: string;
  /** What a booking cannot be: each shows how the site says so. */
  notAllowed?: boolean;
  items: Situation[];
};

const D1 = "2026-11-03";
const D2 = addDays(D1, 1);
const D3 = addDays(D1, 2);
const D4 = addDays(D1, 3);
const D5 = addDays(D1, 4);
const D6 = addDays(D1, 5);

const LGK = "Langkawi International Airport";
const PELANGI = "Pelangi Beach Resort, Langkawi";
const KUAH = "Kuah Jetty, Langkawi";
const DATAI = "The Datai Langkawi";
const KLIA = "KLIA Terminal 1, Sepang";
const KLHOTEL = "Mandarin Oriental, Kuala Lumpur";
const CAMERON = "Cameron Highlands, Tanah Rata";

function trip(
  start: Partial<Trip> & Pick<Trip, "from" | "date" | "time">,
): Trip {
  return {
    id: newId(),
    mode: "oneway",
    to: "",
    hours: 8,
    flight: "",
    notes: "",
    ...start,
  };
}

function vehicle(classId: string, passengers: number): ChosenVehicle {
  return { category: classOf(classId).category, classId, passengers };
}

/** The vehicle still to choose, for a group of this size. */
function toChoose(
  passengers: number,
  category: TripCategory = "car-with-driver",
): Vehicle {
  return { category, classId: null, passengers };
}

function withState(change: Partial<ExampleState>): ExampleState {
  return { ...freshState(), ...change };
}

/** The search card holding these trips, the last one open. */
function searching(
  search: SearchRow[],
  change: Partial<ExampleState> = {},
): ExampleState {
  return withState({ search, ...change });
}

/** Four days in Langkawi for five in an MPV: the sample most situations change one thing in. */
function langkawi(): Trip[] {
  const there = trip({
    from: LGK,
    to: PELANGI,
    date: D1,
    time: "10:30",
    flight: "MH 1432",
  });
  return [
    there,
    trip({ mode: "hourly", from: PELANGI, hours: 8, date: D2, time: "09:00" }),
    trip({ mode: "hourly", from: PELANGI, hours: 8, date: D3, time: "09:00" }),
    trip({
      from: PELANGI,
      to: LGK,
      date: D4,
      time: "14:00",
      flight: "AK 6305",
    }),
  ];
}

/** The search for a driver for eight hours a day from the hotel, on each of these days. */
function hire(dates: string[]): SearchRow[] {
  const first = blankRow({
    mode: "hourly",
    from: PELANGI,
    hours: 8,
    date: dates[0],
    time: "09:00",
  });
  return [
    first,
    ...dates.slice(1).map((date) => ({ ...first, id: newId(), date })),
  ];
}

/** The search for a stay: from the airport, and back, with what is between. */
function stay(between: SearchRow[] = []): SearchRow[] {
  const there = blankRow({ from: LGK, to: PELANGI, date: D1, time: "10:30" });
  return [
    there,
    ...between,
    blankRow({ from: PELANGI, to: LGK, date: D4, time: "14:00" }),
  ];
}

const LANGKAWI_MPV = vehicle("mpv", 5);

/** Three hours from now, on the next quarter hour, in Malaysia. */
function soon() {
  const at = new Date(Date.now() + 3 * 3_600_000 + 8 * 3_600_000);
  const minute = Math.ceil(at.getUTCMinutes() / 15) * 15;
  at.setUTCMinutes(minute, 0, 0);
  const iso = at.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export const SITUATIONS: SituationGroup[] = [
  {
    title: "One trip",
    text: "As the site books today.",
    items: [
      {
        id: "oneway",
        title: "An airport transfer",
        text: "One way, from the airport to the hotel.",
        step: "search",
        load: () =>
          searching([
            blankRow({ from: LGK, to: PELANGI, date: D1, time: "10:30" }),
          ]),
      },
      {
        id: "hourly",
        title: "An hourly driver",
        text: "Eight hours from the hotel.",
        step: "search",
        load: () =>
          searching([
            blankRow({
              mode: "hourly",
              from: PELANGI,
              hours: 8,
              date: D2,
              time: "09:00",
            }),
          ]),
      },
      {
        id: "late-night",
        title: "A late-night arrival",
        text: "A pick-up at 23:40 adds the late-night surcharge.",
        step: "vehicle",
        load: () =>
          withState({
            trips: [
              trip({
                from: LGK,
                to: PELANGI,
                date: D1,
                time: "23:40",
                flight: "AK 6436",
              }),
            ],
          }),
      },
    ],
  },
  {
    title: "Several trips, one vehicle",
    text: "A return, a hire over several days and a different trip every day are all the same: a list of trips, each with its own day, time, places and kind, added one by one. One vehicle does them all.",
    items: [
      {
        id: "return",
        title: "There and back",
        text: "Two one-way trips: there, and back three days later.",
        step: "search",
        load: () => searching(stay()),
      },
      {
        id: "stay",
        title: "A stay with hires between",
        text: "From the airport, a driver for two days, and back to the airport.",
        step: "search",
        load: () => searching(stay(hire([D2, D3]))),
      },
      {
        id: "same-hire-days",
        title: "The same hire every day",
        text: "A coach hourly for three days: three trips, the same hire each day.",
        step: "search",
        load: () =>
          searching(hire([D2, D3, D4]), {
            vehicle: toChoose(25, "coach-charter"),
          }),
      },
      {
        id: "different-trips",
        title: "A different trip each day",
        text: "Day 1 eight hours, day 2 two hours, day 3 to the airport.",
        step: "search",
        load: () =>
          searching([
            blankRow({
              mode: "hourly",
              from: PELANGI,
              hours: 8,
              date: D2,
              time: "09:00",
            }),
            blankRow({
              mode: "hourly",
              from: PELANGI,
              hours: 2,
              date: D3,
              time: "19:00",
            }),
            blankRow({ from: PELANGI, to: LGK, date: D4, time: "14:00" }),
          ]),
      },
      {
        id: "across-the-country",
        title: "Across the country",
        text: "KLIA, Kuala Lumpur, Cameron Highlands and back, with a night away for the driver.",
        step: "confirm",
        load: () =>
          withState({
            vehicle: vehicle("mpv", 4),
            trips: [
              trip({
                from: KLIA,
                to: KLHOTEL,
                date: D1,
                time: "08:30",
                flight: "MH 2",
              }),
              trip({
                mode: "hourly",
                from: KLHOTEL,
                hours: 8,
                date: D2,
                time: "09:30",
              }),
              trip({ from: KLHOTEL, to: CAMERON, date: D3, time: "10:00" }),
              trip({
                mode: "hourly",
                from: CAMERON,
                hours: 6,
                date: D4,
                time: "09:00",
                issue: "overnight",
              }),
              trip({ from: CAMERON, to: KLIA, date: D6, time: "07:00" }),
            ],
          }),
      },
    ],
  },
  {
    title: "Before confirming",
    text: "What the confirm page catches. A trip that cannot be booked as it is says so on itself, and nothing typed is lost.",
    items: [
      {
        id: "too-soon",
        title: "Too soon to book online",
        text: "A trip three hours from now.",
        step: "confirm",
        load: () =>
          withState({
            vehicle: vehicle("sedan", 2),
            trips: [
              trip({ from: PELANGI, to: LGK, ...soon(), issue: "notice" }),
            ],
          }),
      },
      {
        id: "quote",
        title: "A trip we cannot price",
        text: "Outside our areas: it goes as a request for a quote, the rest as priced.",
        step: "confirm",
        load: () =>
          withState({
            vehicle: vehicle("mpv", 4),
            trips: [
              trip({ from: KLIA, to: KLHOTEL, date: D1, time: "08:30" }),
              trip({
                from: "Kuala Terengganu Airport",
                to: "Merang Jetty, Terengganu",
                date: D3,
                time: "11:00",
                issue: "quote",
              }),
            ],
          }),
      },
      {
        id: "repriced",
        title: "A price changed",
        text: "Trips left waiting are priced again with today's rates.",
        step: "confirm",
        load: () => {
          const trips = langkawi();
          trips[0] = { ...trips[0]!, wasPrice: 120 };
          return withState({ trips, vehicle: LANGKAWI_MPV });
        },
      },
    ],
  },
  {
    title: "After booking",
    text: "Each trip is one booking item: confirmed, given a driver and cancelled on its own.",
    items: [
      {
        id: "received",
        title: "A visitor's booking",
        text: "The reference and where the email went.",
        step: "received",
        load: () =>
          withState({
            booking: {
              reference: "HT-7K3QZM",
              trips: langkawi().map((t) => ({ ...t, status: "received" })),
              vehicle: LANGKAWI_MPV,
              contact: ACCOUNT,
              guest: true,
              seenAt: null,
            },
          }),
      },
      {
        id: "mid-trip",
        title: "Halfway through the trip",
        text: "Done, under way, confirmed, waiting, cancelled by you and cancelled by us.",
        step: "booking",
        load: () =>
          withState({
            signedIn: true,
            contact: ACCOUNT,
            booking: {
              reference: "HT-7K3QZM",
              vehicle: LANGKAWI_MPV,
              contact: ACCOUNT,
              guest: false,
              seenAt: `${D3}T12:00:00+08:00`,
              trips: [
                trip({
                  from: LGK,
                  to: PELANGI,
                  date: D1,
                  time: "10:30",
                  flight: "MH 1432",
                  status: "completed",
                }),
                trip({
                  mode: "hourly",
                  from: PELANGI,
                  hours: 8,
                  date: D2,
                  time: "09:00",
                  status: "completed",
                }),
                trip({
                  mode: "hourly",
                  from: PELANGI,
                  hours: 8,
                  date: D3,
                  time: "09:00",
                  status: "assigned",
                }),
                trip({
                  from: PELANGI,
                  to: KUAH,
                  date: D3,
                  time: "19:00",
                  status: "cancelled",
                  cancelledBy: "customer",
                }),
                trip({
                  mode: "hourly",
                  from: PELANGI,
                  hours: 2,
                  date: D4,
                  time: "08:00",
                  status: "cancelled",
                  cancelledBy: "admin",
                  cancelNote:
                    "We could not find a driver for this time. You are not charged for it.",
                }),
                trip({
                  from: PELANGI,
                  to: DATAI,
                  date: D5,
                  time: "10:00",
                  status: "confirmed",
                }),
                trip({
                  from: PELANGI,
                  to: LGK,
                  date: D6,
                  time: "14:00",
                  flight: "AK 6305",
                  status: "received",
                }),
              ],
            },
          }),
      },
    ],
  },
  {
    title: "Not allowed",
    text: "A booking has one vehicle, and it does one trip at a time. Each of these opens where the site says so, and what to do instead.",
    notAllowed: true,
    items: [
      {
        id: "different-vehicle",
        title: "A different vehicle on some trips",
        text: "An MPV to the hotel, a coach for the tour day. The other vehicle is a booking of its own.",
        step: "vehicle",
        load: () =>
          withState({
            vehicle: toChoose(5),
            trips: [
              trip({ from: LGK, to: PELANGI, date: D1, time: "10:30" }),
              trip({
                mode: "hourly",
                from: PELANGI,
                hours: 8,
                date: D2,
                time: "09:00",
              }),
              trip({ from: PELANGI, to: LGK, date: D3, time: "14:00" }),
            ],
          }),
      },
      {
        id: "two-vehicles",
        title: "Two vehicles for one group",
        text: "Fourteen travellers, more than any car seats: one coach instead, or two bookings.",
        step: "vehicle",
        load: () =>
          withState({
            vehicle: toChoose(14),
            trips: [trip({ from: LGK, to: PELANGI, date: D1, time: "10:30" })],
          }),
      },
      {
        id: "at-once",
        title: "Two trips at the same time",
        text: "A transfer during a hire, and the group splitting up. The search says so as each trip is typed, and the confirm page checks again.",
        step: "search",
        load: () => {
          const transfer = blankRow({
            from: PELANGI,
            to: DATAI,
            date: D2,
            time: "12:00",
          });
          return searching(
            [
              blankRow({
                mode: "hourly",
                from: PELANGI,
                hours: 8,
                date: D2,
                time: "09:00",
              }),
              transfer,
              blankRow({ from: PELANGI, to: LGK, date: D3, time: "09:00" }),
              blankRow({ from: PELANGI, to: KUAH, date: D3, time: "09:00" }),
            ],
            { editing: transfer.id },
          );
        },
      },
    ],
  },
  {
    title: "Coming later",
    text: "Other products, shown where they will sit.",
    items: [
      {
        id: "later",
        title: "Tickets, hotels and a pasted plan",
        text: "Next to the trips, marked Soon.",
        step: "confirm",
        load: () => withState({ trips: langkawi(), vehicle: LANGKAWI_MPV }),
      },
    ],
  },
];
