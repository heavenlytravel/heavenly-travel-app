"use client";

import { DROPOFF_RULES, DROPOFF_RULE_LABELS, type DropoffRule } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { useOptimistic, useState, useTransition } from "react";
import { setDropoffRuleAction } from "./actions";

/** What each rule means for a trip from the location, under its label. */
function noteOf(rule: DropoffRule, locationName: string) {
  switch (rule) {
    case "anywhere":
      return "A trip may end anywhere in Malaysia: at the grid price where the route has one, metered otherwise.";
    case "zones":
      return `The drop-off must be in one of ${locationName}'s zones: at the grid price where the route has one, metered otherwise. Any other drop-off is refused.`;
    case "grid":
      return "Only a route with a price on the grid can be booked, and only in the classes priced on it. Nothing is metered.";
  }
}

/**
 * Where a one-way trip from the location may end: the three rules as
 * cards, the one in force marked. Choosing one saves it at once; the mark
 * moves straight away and the line under the cards says when it is saved.
 */
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
  const [shown, setShown] = useOptimistic(rule);
  const [outcome, setOutcome] = useState<{ error: string | null } | null>(null);

  function choose(option: DropoffRule) {
    setOutcome(null);
    startTransition(async () => {
      setShown(option);
      const result = await setDropoffRuleAction(locationId, option);
      setOutcome({ error: result?.error ?? null });
    });
  }

  return (
    <fieldset disabled={pending}>
      <legend className="sr-only">Drop-off rule</legend>
      <div className="grid gap-2">
        {DROPOFF_RULES.map((option) => {
          const checked = shown === option;
          return (
            <label
              key={option}
              className={cx(
                "flex items-start gap-3 rounded-lg border p-3.5 text-sm transition-colors",
                checked
                  ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
                pending ? "cursor-wait" : "cursor-pointer",
              )}
            >
              <input
                type="radio"
                name="dropoffRule"
                value={option}
                checked={checked}
                onChange={() => choose(option)}
                className="mt-0.5 size-4 shrink-0 accent-neutral-900"
              />
              <span className="grid gap-0.5">
                <span className="font-medium text-neutral-900">
                  {DROPOFF_RULE_LABELS[option]}
                </span>
                <span className="text-neutral-600">
                  {noteOf(option, locationName)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p
        aria-live="polite"
        className={cx(
          "mt-3 min-h-5 text-sm",
          pending
            ? "text-neutral-500"
            : outcome?.error
              ? "text-red-700"
              : "text-emerald-700",
        )}
      >
        {pending
          ? "Saving…"
          : outcome?.error
            ? outcome.error
            : outcome
              ? "Saved."
              : null}
      </p>
    </fieldset>
  );
}
