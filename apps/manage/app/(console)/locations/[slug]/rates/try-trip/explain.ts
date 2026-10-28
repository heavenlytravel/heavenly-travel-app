import {
  EXTRA_CAPPED,
  WEEKEND_REASON_LABELS,
  chargedKmOf,
  extraKmOf,
  formatMyr,
  lineBetweenKm,
  payableExtraKmOf,
  type LngLat,
  type TraceStep,
  type TracedRoute,
  type TripEnd,
} from "@repo/db";
import type { TryTripAnswer } from "./actions";

/**
 * What Try a trip says and draws, from the quote's answer and its trace:
 * the calculation in lines, the steps one by one, and the map's layers
 * for each, every line and dot with what it measures for the map's hover.
 * A calculation line names the layers it is about, so picking it lights
 * them up. Pure, so the workspace only renders. See
 * docs/261023-nearest-zone-pricing.md, "Try a trip, on the Rates tab".
 */

/** What a layer stands for, so a calculation line can light it up. */
export type LayerKey =
  "trip" | "grid" | "extra-pickup" | "extra-dropoff" | "route";

/** What the map draws: a line in one of the pricing's styles, or a dot, and what a hover says of it. */
export type MapLayer = { key?: LayerKey; label?: string } & (
  | {
      kind: "line";
      path: LngLat[];
      style: "trip" | "grid" | "extra" | "route" | "straight";
    }
  | { kind: "dot"; at: LngLat; style: "entry" | "edge" | "target" }
);

/** One step of the quote as the step view shows it. */
export type ExplainedStep = {
  title: string;
  /** What Google was asked, or null for a step with no call. */
  asked: string | null;
  answered: string | null;
  workedOut: string;
  layers: MapLayer[];
};

type Answered = Extract<TryTripAnswer, { ok: true }>;

const km = (value: number) => `${value.toFixed(2)} km`;
const wholeKm = (value: number) => `${value} km`;
const END_NAMES: Record<TripEnd, string> = {
  pickup: "the pickup",
  dropoff: "the drop-off",
};

const asRoad = (route: TracedRoute) => ({
  distanceKm: route.distanceKm,
  line: route.line,
});

/** The measured part of a traced route, and the full line under it. */
function routeLayers(
  route: TracedRoute,
  style: "trip" | "grid",
  label: string,
): MapLayer[] {
  const road = asRoad(route);
  const part = lineBetweenKm(road, route.fromKm, route.toKm);
  return [
    {
      kind: "line",
      path: route.line,
      style: "route",
      key: "route",
      label: `Route as Google drew it: ${km(route.distanceKm)}`,
    },
    ...(part.length > 1
      ? [{ kind: "line" as const, path: part, style, key: style, label }]
      : []),
    ...(style === "grid" && part.length > 0
      ? [
          {
            kind: "dot" as const,
            at: part[0]!,
            style: "edge" as const,
            key: "grid" as const,
            label: "Where the grid trip is measured from",
          },
          {
            kind: "dot" as const,
            at: part.at(-1)!,
            style: "edge" as const,
            key: "grid" as const,
            label: "Where the grid trip is measured to",
          },
        ]
      : []),
  ];
}

/** What a hover on an end's extra road says: its km, the free km and what is paid for. */
function extraLabel(
  answer: Answered,
  end: TripEnd,
  zone: string,
  extra: number,
) {
  const free = answer.quote?.reach.freeExtraKm ?? 0;
  const paid = Math.max(0, extra - free);
  const freePart = free > 0 ? `, the first ${wholeKm(free)} free` : "";
  return `Extra road, ${END_NAMES[end]} to ${zone}'s edge: ${km(extra)}${freePart}; ${km(paid)} counts toward the charge`;
}

/** The road from an address to its zone's edge, dashed, from a route to the zone. */
function extraLayers(
  answer: Answered,
  step: Extract<TraceStep, { kind: "route-to-zone" }>,
) {
  const layers: MapLayer[] = [];
  const key = step.end === "pickup" ? "extra-pickup" : "extra-dropoff";
  if (step.line && step.distanceKm !== null && step.extraKm !== null) {
    const road = { distanceKm: step.distanceKm, line: step.line };
    layers.push({
      kind: "line",
      path: lineBetweenKm(road, 0, step.extraKm),
      style: "extra",
      key,
      label: extraLabel(answer, step.end, step.zone, step.extraKm),
    });
  }
  if (step.entry) {
    layers.push({
      kind: "dot",
      at: step.entry,
      style: "entry",
      key,
      label: `Entry spot: where ${END_NAMES[step.end]}'s road meets ${step.zone}`,
    });
  }
  return layers;
}

const tripLabel = (route: TracedRoute) =>
  `Trip: ${km(route.km)}, from the zone edges or an address outside every zone`;
const gridLabel = (route: TracedRoute) =>
  `Grid trip: ${km(route.km)}, between the two zones' edges or entry spots`;

/** Every step, in order, with what was asked, answered and worked out, and what the map draws. */
export function explainSteps(answer: Answered): ExplainedStep[] {
  const steps: ExplainedStep[] = [];
  // The winning road of each end, to keep on the map past its step.
  const kept: MapLayer[] = [];
  const winners = new Map<TripEnd, { km: number; layers: MapLayer[] }>();
  for (const step of answer.trace.steps) {
    switch (step.kind) {
      case "ends": {
        const where = (zone: string | null) =>
          zone ? `inside ${zone}` : "outside every zone";
        steps.push({
          title: "Which zone each end is in",
          asked: null,
          answered: null,
          workedOut: `${answer.pickup.label} is ${where(step.pickup.zone)}; ${answer.dropoff.label} is ${where(step.dropoff?.zone ?? null)}.`,
          layers: [],
        });
        break;
      }
      case "candidates":
        steps.push({
          title: `The zones near ${END_NAMES[step.end]}`,
          asked: null,
          answered: null,
          workedOut:
            step.zones.length === 0
              ? `No zone within ${step.maxExtraKm} km in a straight line.`
              : `Within ${step.maxExtraKm} km in a straight line, nearest first: ${step.zones.map((z) => `${z.name} ${km(z.straightKm)}`).join(", ")}. A road is never shorter, so these are the only ones to ask about.`,
          layers: step.zones.map((zone) => ({
            kind: "line",
            path: [step.at, zone.closest],
            style: "straight",
            label: `${zone.name}: ${km(zone.straightKm)} in a straight line`,
          })),
        });
        break;
      case "route-to-zone": {
        const layers = extraLayers(answer, step);
        steps.push({
          title: `Route to ${step.zone}`,
          asked: `${END_NAMES[step.end]} to a point inside ${step.zone}, with its line`,
          answered: step.line
            ? `a road of ${km(step.distanceKm ?? 0)} and its line`
            : "no road",
          workedOut:
            step.extraKm === null
              ? `No road reaches ${step.zone}.`
              : `The line first enters ${step.zone} after ${km(step.extraKm)}: its extra road.`,
          layers: [
            ...(step.line
              ? [
                  {
                    kind: "line" as const,
                    path: step.line,
                    style: "route" as const,
                    label: `Route to inside ${step.zone}: ${km(step.distanceKm ?? 0)}`,
                  },
                ]
              : []),
            {
              kind: "dot",
              at: step.target,
              style: "target",
              label: `The point inside ${step.zone} the route was asked to`,
            },
            ...layers,
          ],
        });
        const best = winners.get(step.end);
        if (step.extraKm !== null && (!best || step.extraKm < best.km)) {
          winners.set(step.end, { km: step.extraKm, layers });
        }
        break;
      }
      case "nearest": {
        const layers: MapLayer[] =
          step.cached && step.entry
            ? [
                {
                  kind: "dot",
                  at: step.entry,
                  style: "entry",
                  key: step.end === "pickup" ? "extra-pickup" : "extra-dropoff",
                  label: `Entry spot of ${step.zone}, from the cache`,
                },
              ]
            : (winners.get(step.end)?.layers ?? []);
        kept.push(...layers);
        steps.push({
          title: `The nearest zone of ${END_NAMES[step.end]}`,
          asked: null,
          answered: null,
          workedOut: step.zone
            ? `Nearest by road is ${step.zone}, ${km(step.extraKm ?? 0)} to its edge${step.cached ? ", from the cache: no call was made" : ""}.${step.beaten.length > 0 ? ` It beat ${step.beaten.map((b) => (b.extraKm === null ? `${b.zone} (no road)` : `${b.zone} ${km(b.extraKm)}`)).join(", ")}.` : ""}`
            : `No zone is reached within the furthest extra road${step.cached ? ", from the cache" : ""}.`,
          layers: [...layers],
        });
        break;
      }
      case "trip":
        steps.push({
          title: "The trip",
          asked: "the pickup to the drop-off, with its line",
          answered: step.route
            ? `${km(step.route.distanceKm)} pin to pin (kept on the receipt)`
            : "no road",
          workedOut: step.route
            ? `Measured from the zone edges, or an address outside every zone: ${km(step.route.km)}.`
            : "No road joins the two pins.",
          layers: [
            ...kept,
            ...(step.route
              ? routeLayers(step.route, "trip", tripLabel(step.route))
              : []),
          ],
        });
        break;
      case "grid-trip":
        steps.push({
          title: "The grid trip",
          asked:
            "between the two stand-ins: an address in a zone, or the entry spot of one outside",
          answered: step.route
            ? `a road of ${km(step.route.distanceKm)}`
            : "no road",
          workedOut: step.route
            ? `From the first zone's edge to the second's: ${km(step.route.km)}.`
            : "No road joins the two stand-ins.",
          layers: [
            ...kept,
            ...(step.route
              ? routeLayers(step.route, "grid", gridLabel(step.route))
              : []),
          ],
        });
        break;
    }
  }
  steps.push({
    title: "The price",
    asked: null,
    answered: null,
    workedOut: priceLine(answer),
    layers: allLayers(answer),
  });
  return steps;
}

/** The trip, the extra roads and the grid trip together: the calculation's map. */
export function allLayers(answer: Answered): MapLayer[] {
  const layers: MapLayer[] = [];
  for (const step of answer.trace.steps) {
    if (step.kind === "trip" && step.route) {
      layers.push(...routeLayers(step.route, "trip", tripLabel(step.route)));
    } else if (step.kind === "grid-trip" && step.route) {
      layers.push(...routeLayers(step.route, "grid", gridLabel(step.route)));
    } else if (step.kind === "nearest" && step.entry) {
      const road = answer.trace.steps.find(
        (s): s is Extract<TraceStep, { kind: "route-to-zone" }> =>
          s.kind === "route-to-zone" &&
          s.end === step.end &&
          s.zone === step.zone,
      );
      if (road) {
        layers.push(...extraLayers(answer, road));
      } else {
        layers.push({
          kind: "dot",
          at: step.entry,
          style: "entry",
          key: step.end === "pickup" ? "extra-pickup" : "extra-dropoff",
          label: `Entry spot of ${step.zone}, from the cache`,
        });
      }
    }
  }
  return layers;
}

/** The price's last step in a line. */
function priceLine(answer: Answered) {
  if (answer.refused) {
    return `${answer.refused.message}${answer.refused.reason ? ` (${answer.refused.reason})` : ""}`;
  }
  const quote = answer.quote;
  if (!quote?.price) return "Not on the grid for this class.";
  return quote.rows.map(([label, value]) => `${label} ${value}`).join("; ");
}

/** One line of the calculation, its value when it has one, and the map's layers it is about. */
export type CalcLine = {
  label: string;
  detail: string;
  /** What a pick of the line lights up on the map. */
  focus?: LayerKey[];
  /** The fare: shown larger. */
  total?: boolean;
};

/**
 * The extra road worked through: each end's road past its zone's edge,
 * less the free km, added, rounded up to the whole km, at the rate. The
 * same sums `chargedKmOf` does, set out.
 */
function extraRoadDetail(answer: Answered): string {
  const quote = answer.quote!;
  const trip = quote.zoneTrip!;
  const free = quote.reach.freeExtraKm;
  const charged = chargedKmOf(trip, free);
  if (charged === 0) {
    return trip.tripKm > trip.gridTripKm
      ? `Every end outside a zone is within the ${wholeKm(free)} free: nothing is added.`
      : `The trip, ${km(trip.tripKm)}, is not longer than the grid trip, ${km(trip.gridTripKm)}: nothing is added.`;
  }
  const parts = (["pickup", "dropoff"] as const).flatMap((end) => {
    const e = trip[end];
    if (!e.nearest) return [];
    const less = free > 0 ? ` − ${wholeKm(free)} free` : "";
    return [`${END_NAMES[end].replace("the ", "")} ${km(e.extraKm)}${less}`];
  });
  const payable = payableExtraKmOf(trip, free);
  const extra = extraKmOf(trip);
  const added = trip.tripKm - trip.gridTripKm;
  const capped =
    EXTRA_CAPPED && added < extra
      ? `; capped: the trip adds ${km(added)} over the grid trip`
      : "";
  const perKm = quote.price?.zoneTrip?.perKmSen;
  const rate = perKm === undefined ? "the rate per extra km" : formatMyr(perKm);
  const amount = quote.price?.zoneTrip
    ? ` = ${formatMyr(quote.price.zoneTrip.extraSen)}`
    : "";
  return `${parts.join(" + ")} = ${km(payable)}${capped}, rounded up to ${wholeKm(charged)} × ${rate}${amount}`;
}

/** The calculation, as the pricing demo set it out: each end's zone, the base price, the distances, what is added, the fare. */
export function explainCalculation(answer: Answered): CalcLine[] {
  const lines: CalcLine[] = [];
  const quote = answer.quote;
  const nearestStep = (end: TripEnd) =>
    answer.trace.steps.find(
      (s): s is Extract<TraceStep, { kind: "nearest" }> =>
        s.kind === "nearest" && s.end === end,
    );
  const candidates = (end: TripEnd) =>
    answer.trace.steps.find(
      (s): s is Extract<TraceStep, { kind: "candidates" }> =>
        s.kind === "candidates" && s.end === end,
    );
  const endLine = (end: TripEnd, label: string) => {
    const ends = answer.trace.steps.find((s) => s.kind === "ends");
    const inside =
      ends?.kind === "ends"
        ? end === "pickup"
          ? ends.pickup.zone
          : (ends.dropoff?.zone ?? null)
        : null;
    const nearest = nearestStep(end);
    if (!nearest) {
      return inside ? `inside ${inside}` : "outside every zone";
    }
    if (!nearest.zone) return "outside every zone, and no zone is reached";
    const straight = candidates(end)?.zones[0];
    const differs =
      straight && straight.name !== nearest.zone
        ? `; nearest in a straight line is ${straight.name}, ${km(straight.straightKm)}, but its road is longer`
        : "";
    return `${label} is outside every zone; nearest by road is ${nearest.zone}, ${km(nearest.extraKm ?? 0)} to its edge${differs}`;
  };
  lines.push({
    label: "Pickup",
    detail: endLine("pickup", answer.pickup.label),
    focus: ["extra-pickup"],
  });
  lines.push({
    label: "Drop-off",
    detail: endLine("dropoff", answer.dropoff.label),
    focus: ["extra-dropoff"],
  });
  if (answer.refused) {
    lines.push({
      label: "Not priced",
      detail: `${answer.refused.message}${answer.refused.reason ? ` Why: ${answer.refused.reason}.` : ""}`,
    });
    return lines;
  }
  if (!quote) return lines;
  const cell =
    quote.pickup.zone === quote.dropoff.zone
      ? `within ${quote.pickup.zone}`
      : `${quote.pickup.zone} to ${quote.dropoff.zone}`;
  lines.push({
    label: "Base price",
    detail: quote.price?.route
      ? `grid ${cell} = ${formatMyr(quote.price.route.rateSen)}`
      : `grid ${cell}: not on the grid yet for this class`,
  });
  const trip = quote.zoneTrip;
  if (!trip) {
    lines.push({
      label: "Distances",
      detail:
        "Both ends are in zones: the cell is the price, whatever the distance.",
    });
  } else {
    lines.push({
      label: "Grid trip",
      detail: `${km(trip.gridTripKm)}, from ${trip.pickup.nearest ? "the pickup's entry spot" : `${trip.pickup.zone}'s edge`} to ${trip.dropoff.nearest ? "the drop-off's entry spot" : `${trip.dropoff.zone}'s edge`}`,
      focus: ["grid"],
    });
    lines.push({
      label: "Trip",
      detail: `${km(trip.tripKm)}, from ${trip.pickup.nearest ? answer.pickup.label : `${trip.pickup.zone}'s edge`} to ${trip.dropoff.nearest ? answer.dropoff.label : `${trip.dropoff.zone}'s edge`}`,
      focus: ["trip"],
    });
    lines.push({
      label: "Extra road",
      detail: extraRoadDetail(answer),
      focus: ["extra-pickup", "extra-dropoff"],
    });
  }
  const price = quote.price;
  if (price?.surcharge) {
    lines.push({
      label: "Odd hours",
      detail: `${price.surcharge.percent !== null ? `+${price.surcharge.percent}% of ${formatMyr(price.subtotalSen)}` : "a flat amount"} = ${formatMyr(price.surcharge.amountSen)}`,
    });
  }
  if (price?.weekend) {
    lines.push({
      label: WEEKEND_REASON_LABELS[price.weekend.reason],
      detail: `${price.weekend.percent !== null ? `+${price.weekend.percent}% of ${formatMyr(price.subtotalSen)}` : "a flat amount"} = ${formatMyr(price.weekend.amountSen)}`,
    });
  }
  if (price) {
    lines.push({
      label: "Fare",
      detail: formatMyr(price.totalSen),
      total: true,
    });
  }
  return lines;
}

/** The answer as text to paste in a chat: the trip, the receipt and the fare. */
export function breakdownText(answer: Answered, className: string): string {
  const head = `${answer.pickup.label} to ${answer.dropoff.label}, ${className}`;
  if (answer.refused) return `${head}\n${answer.refused.message}`;
  const quote = answer.quote;
  if (!quote?.price) return `${head}\nNot on the grid for this class.`;
  return [
    head,
    ...quote.rows.map(([label, value]) => `${label}: ${value}`),
    `Total: ${formatMyr(quote.price.totalSen)}`,
  ].join("\n");
}
