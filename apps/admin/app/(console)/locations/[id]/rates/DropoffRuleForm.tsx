"use client";

import { DROPOFF_RULES, DROPOFF_RULE_LABELS, type DropoffRule } from "@repo/db";
import { useState, useTransition } from "react";
import { setDropoffRuleAction } from "./actions";

/** What each rule means for a trip from the location, under its label. */
function noteOf(rule: DropoffRule, locationName: string) {
  switch (rule) {
    case "anywhere":
      return `A trip from a pickup in ${locationName} may end anywhere in Malaysia: at the grid price where the route has one, metered otherwise.`;
    case "zones":
      return `The drop-off must fall in one of ${locationName}'s zones: at the grid price where the route has one, metered otherwise. A drop-off outside them is refused.`;
    case "grid":
      return `Only a route with a price on the grid can be booked, and only in a class the route has a price for. An empty cell on the grid means that class is not offered on that route.`;
  }
}

/** Where a one-way trip from the location may end: one of the three rules. */
export function DropoffRuleForm({
  locationId,
  locationName,
  rule,
}: {
  locationId: string;
  locationName: string;
  rule: DropoffRule;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <fieldset className="grid gap-3" disabled={pending}>
      <legend className="sr-only">Drop-off rule</legend>
      {DROPOFF_RULES.map((option) => (
        <label key={option} className="flex items-start gap-2.5 text-sm">
          <input
            type="radio"
            name="dropoffRule"
            value={option}
            checked={rule === option}
            onChange={() => {
              setError(null);
              startTransition(async () => {
                const result = await setDropoffRuleAction(locationId, option);
                setError(result?.error ?? null);
              });
            }}
            className="mt-1 accent-neutral-900"
          />
          <span className="grid gap-0.5">
            <span className="font-medium">{DROPOFF_RULE_LABELS[option]}</span>
            <span className="text-neutral-600">
              {noteOf(option, locationName)}
            </span>
          </span>
        </label>
      ))}
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
