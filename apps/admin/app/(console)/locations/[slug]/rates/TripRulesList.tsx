import {
  CROSS_LOCATION_NAME,
  extraRoadLabel,
  formatDay,
  oddHoursLabel,
  weekendLabel,
  type TripRules,
} from "@repo/db";
import { crossLocationNote } from "./trip-reach-note";

/**
 * A location's trip rules, read only, a line each: for the admins who
 * cannot change them, and on Rates across locations.
 */
export function TripRulesList({
  rules,
  locationName,
}: {
  rules: TripRules;
  locationName: string;
}) {
  const { reach, oddHours, weekend } = rules;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[11rem_1fr]">
      <dt className="text-slate-500">Extra road</dt>
      <dd className="font-medium text-slate-900">
        {extraRoadLabel(reach)} past a zone&apos;s edge
      </dd>
      <dt className="text-slate-500">{CROSS_LOCATION_NAME}</dt>
      <dd>
        <span className="font-medium text-slate-900">
          {reach.crossLocation ? "On" : "Off"}.
        </span>{" "}
        <span className="text-slate-600">
          {crossLocationNote(reach.crossLocation, locationName)}
        </span>
      </dd>
      <dt className="text-slate-500">Odd hours</dt>
      <dd className="text-slate-600">
        {oddHours ? `Pickups from ${oddHoursLabel(oddHours)}.` : "Off."}
      </dd>
      <dt className="text-slate-500">Weekends and holidays</dt>
      <dd className="text-slate-600">
        {weekend
          ? `${weekendLabel(weekend)}.${weekend.dates.length > 0 ? ` Holidays: ${weekend.dates.map(formatDay).join(", ")}.` : ""}`
          : "Off."}
      </dd>
    </dl>
  );
}
