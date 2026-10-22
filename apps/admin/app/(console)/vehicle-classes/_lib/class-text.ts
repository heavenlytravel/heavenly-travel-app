import type { OfferingRules } from "@repo/db";

/** How a card spells an offering's rules: "4 h notice · cancel up to 24 h · at least 3 h hourly" */
export function rulesText(rules: OfferingRules) {
  return [
    `${rules.minLeadHours} h notice`,
    `cancel up to ${rules.cancellationCutoffHours} h`,
    `at least ${rules.minHourlyHours} h hourly`,
  ].join(" · ");
}

/** How a card spells a class's seats: "3" or "1 to 6" */
export function seatsText(vehicleClass: {
  minPassengers: number;
  maxPassengers: number;
}) {
  return vehicleClass.minPassengers === vehicleClass.maxPassengers
    ? String(vehicleClass.maxPassengers)
    : `${vehicleClass.minPassengers} to ${vehicleClass.maxPassengers}`;
}
