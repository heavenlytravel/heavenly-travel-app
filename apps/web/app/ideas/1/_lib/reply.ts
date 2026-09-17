/**
 * Heavenly Travel's side of the correspondence: given the trip the customer
 * has written, compose the reply, one sentence per entry. Pure functions over
 * the shared route and fleet data, so the page and the WhatsApp message can
 * never disagree about a vehicle, a time or a fare.
 */

import { ringgit, type Vehicle } from "../../../_lib/content";
import {
  MAX_SEATS,
  PLACES,
  driveMinutes,
  formatDrive,
  oneWayFare,
  vehicleById,
  vehicleFor,
  type Place,
  type PlaceId,
} from "../../../_lib/routes";
import type { ServiceKey } from "../../../_lib/trip";

/** How each service reads inside "and we'd like ...". */
export const SERVICE_PHRASES: Record<ServiceKey, string> = {
  car: "a car with driver",
  coach: "a coach to ourselves",
  transfer: "an airport transfer",
  tour: "a day tour",
};

export const MAX_PEOPLE = 999;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** "2026-10-03" to "Sat 3 Oct", or null when the date is blank or partial. */
export function formatTripDate(iso: string, withYear = false): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== day) return null;
  const text = `${DAYS[date.getUTCDay()]} ${day} ${MONTHS[month - 1]}`;
  return withYear ? `${text} ${year}` : text;
}

export function placeByName(name: string): Place {
  return PLACES.find((p) => p.name === name) ?? PLACES[0]!;
}

export function parsePeople(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(MAX_PEOPLE, Math.max(0, n)) : 0;
}

/** How a place's note reads in the middle of a sentence. */
const NOTE_PHRASES: Partial<Record<PlaceId, string>> = {
  langkawi: "including the ferry",
  cameron: "taking the mountain road slowly",
};

function notesFor(places: Place[]): string {
  const phrases = places.flatMap((p) => {
    if (!p.note) return [];
    return [NOTE_PHRASES[p.id] ?? `${p.name}: ${p.note.toLowerCase()}`];
  });
  return phrases.length > 0 ? `, ${phrases.join(" and ")}` : "";
}

function chooseVehicle(
  people: number,
  service: ServiceKey,
): { vehicle: Vehicle; count: number; line: string } {
  const fit = vehicleFor(people);
  if (fit.count > 1) {
    return {
      ...fit,
      line: `${people} of you is more than any one vehicle holds (our largest seats ${MAX_SEATS}), so you want ${fit.count} coaches of ${fit.vehicle.seats} seats, travelling in convoy.`,
    };
  }
  if (service === "coach" && fit.vehicle.kind === "car") {
    const minibus = vehicleById("minibus");
    return {
      vehicle: minibus,
      count: 1,
      line: `You asked for a coach, so: the ${minibus.name}. For ${people === 1 ? "one person" : `${people} of you`} the ${fit.vehicle.name} would also do, and costs less.`,
    };
  }
  if (service === "car" && fit.vehicle.kind === "coach") {
    return {
      ...fit,
      line: `${people} of you won’t fit in a car, so you want the ${fit.vehicle.name}.`,
    };
  }
  return { ...fit, line: `Then you want the ${fit.vehicle.name}.` };
}

export type ReplyInput = {
  people: number;
  from: Place;
  to: Place;
  service: ServiceKey;
  date: string;
};

export function composeReply({
  people,
  from,
  to,
  service,
  date,
}: ReplyInput): string[] {
  const samePlace = from.id === to.id;
  const minutes = driveMinutes(from.id, to.id);
  const journey = samePlace
    ? ""
    : `${formatDrive(minutes)} door to door${notesFor([from, to])}`;

  if (people < 1) {
    return [
      "Tell us how many of you there are and we’ll name the vehicle.",
      samePlace
        ? `${from.name} to ${from.name} is a day out, which we price by the day.`
        : `The road itself is about ${journey}.`,
    ];
  }

  const { vehicle, count, line } = chooseVehicle(people, service);
  const total = count > 1 ? " for the convoy" : "";
  const lines = [line];

  if (samePlace) {
    lines.push(
      `${from.name} to ${from.name} is a day out rather than a transfer, so we price it by the day: from ${ringgit(vehicle.fromPerDay * count)}${total}, driver included, going round as you please.`,
    );
  } else if (service === "tour") {
    lines.push(
      `A day tour is priced by the day, from ${ringgit(vehicle.fromPerDay * count)}${total}. ${to.name} is about ${journey}, so we’d leave early.`,
    );
  } else {
    lines.push(
      `About ${journey}, from ${ringgit(oneWayFare(vehicle.id, from.id, to.id) * count)} one way${total}.`,
    );
  }

  if (service === "transfer") {
    lines.push("Flight tracked and a name board at arrivals, any hour.");
  } else if (count > 1) {
    lines.push("The coaches leave together and arrive together.");
  } else if (!samePlace && (from.id === "langkawi" || to.id === "langkawi")) {
    lines.push("The ferry crossing is part of the plan, not your problem.");
  } else {
    lines.push("Same driver the whole way.");
  }

  const when = formatTripDate(date);
  if (when) lines.push(`We’ll hold ${when} once you say yes.`);

  return lines;
}
