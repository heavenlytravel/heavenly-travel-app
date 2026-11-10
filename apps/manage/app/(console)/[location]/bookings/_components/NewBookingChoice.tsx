"use client";

import { formatMyr } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Radio } from "@repo/ui/field";
import { useEffect, useState } from "react";
import { previewNewBillingAction } from "../new/actions";

/**
 * What confirming the booking bills: its open invoice for its total,
 * issued when the trip is done or by Finance, or nothing yet for an agent
 * on credit. Asked of the server as the total or the agent changes.
 */
function useNewBilling(agentId: string, totalSen: number | null) {
  const key = totalSen === null ? null : `${agentId}:${totalSen}`;
  const [answer, setAnswer] = useState<{ key: string; text: string } | null>(
    null,
  );
  useEffect(() => {
    if (key === null || totalSen === null) return;
    let live = true;
    const timer = setTimeout(async () => {
      const result = await answerOf(
        previewNewBillingAction({ agentId, chargedSen: totalSen }),
      );
      if (live) {
        setAnswer({
          key,
          text: "sentence" in result ? result.sentence : result.error,
        });
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, agentId, totalSen]);
  return answer && answer.key === key ? answer.text : null;
}

/**
 * How the new booking is made, chosen above its one button: confirmed
 * now (every trip ready for Assign, its invoice opens, and what that
 * bills) or saved as received for confirming later, billing nothing.
 */
export function NewBookingChoice({
  agentId,
  totalSen,
  confirm,
  onConfirm,
}: {
  agentId: string;
  /** The booking's total once priced; null before. */
  totalSen: number | null;
  confirm: boolean;
  onConfirm: (confirm: boolean) => void;
}) {
  const sentence = useNewBilling(agentId, totalSen);
  const options = [
    {
      value: true,
      label: "Confirm now",
      hint: `Every trip is ready to assign and its invoice opens. ${
        totalSen === null
          ? "What it bills shows once the trips are priced."
          : (sentence ?? "Working out what it bills…")
      }`,
    },
    {
      value: false,
      label: "Save for later",
      hint: "Saved as received: confirm it on its page later. Nothing is billed until then.",
    },
  ];
  return (
    <fieldset className="grid gap-2">
      <legend className="sr-only">How to make it</legend>
      <input type="hidden" name="confirm" value={confirm ? "1" : ""} />
      {options.map((option) => (
        <label
          key={option.label}
          className="flex cursor-pointer items-start gap-2.5 rounded-control border border-edge p-3 text-sm has-checked:border-brand has-checked:bg-brand-tint"
        >
          <Radio
            name="make"
            checked={confirm === option.value}
            onChange={() => onConfirm(option.value)}
            className="mt-0.5"
          />
          <span className="grid gap-0.5">
            <span className="font-semibold text-ink">
              {option.label}
              {option.value && totalSen !== null ? (
                <span className="font-normal text-muted">
                  {" "}
                  · {formatMyr(totalSen)}
                </span>
              ) : null}
            </span>
            <span className="text-caption text-muted" aria-live="polite">
              {option.hint}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
