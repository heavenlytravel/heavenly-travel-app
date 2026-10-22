"use client";

import { DROPOFF_RULES, DROPOFF_RULE_LABELS, type DropoffRule } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { cx } from "@repo/ui/cx";
import { Radio } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import { useOptimistic, useState, useTransition } from "react";
import { setDropoffRuleAction } from "./actions";
import { dropoffRuleNote } from "./dropoff-note";
import { errorOf } from "../../../../_lib/action-state";

/**
 * Where a one-way trip from the location may end: the three rules as
 * cards, the one in force marked. Choosing one saves it at once; the mark
 * moves straight away, a toast says it is saved, and a refusal stays under
 * the cards.
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
  const [error, setError] = useState<string | null>(null);

  function choose(option: DropoffRule) {
    setError(null);
    startTransition(async () => {
      setShown(option);
      const refused = errorOf(
        await answerOf(setDropoffRuleAction(locationId, option)),
      );
      if (refused) {
        setError(refused);
      } else {
        toast.success(`Drop-offs: ${DROPOFF_RULE_LABELS[option]}.`);
      }
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
              <Radio
                name="dropoffRule"
                value={option}
                checked={checked}
                onChange={() => choose(option)}
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="font-medium text-neutral-900">
                  {DROPOFF_RULE_LABELS[option]}
                </span>
                <span className="text-neutral-600">
                  {dropoffRuleNote(option, locationName)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {pending || error ? (
        <p
          aria-live="polite"
          className={cx(
            "mt-3 text-sm",
            error ? "text-red-700" : "text-neutral-500",
          )}
        >
          {error ?? "Saving…"}
        </p>
      ) : null}
    </fieldset>
  );
}
