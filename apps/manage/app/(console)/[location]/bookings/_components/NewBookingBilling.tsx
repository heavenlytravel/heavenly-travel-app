"use client";

import { LEGACY_INVOICE_MAX } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Field, Input } from "@repo/ui/field";
import { cx } from "@repo/ui/cx";
import { useEffect, useState } from "react";
import { LEGACY_INVOICE_FIELD } from "../_lib/trip-form";
import { previewNewBillingAction } from "../new/actions";

/**
 * What making the booking bills, above its button: confirmed at once, it
 * is billed at once, "Creating issues HTI-0013 for RM 300.00", unless its
 * agent is on credit, or a legacy invoice number is typed, the old
 * system's, which bills nothing here. Asked of the server as the total,
 * the agent or the box changes; the number may go to another booking
 * first.
 */
export function NewBookingBilling({
  agentId,
  totalSen,
  className,
}: {
  agentId: string;
  /** The booking's total once priced; null before. */
  totalSen: number | null;
  className?: string;
}) {
  const [legacy, setLegacy] = useState("");
  const typed = legacy.trim() !== "";
  const key = totalSen === null ? null : `${agentId}:${typed}:${totalSen}`;
  const [answer, setAnswer] = useState<{ key: string; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (key === null || totalSen === null) return;
    let live = true;
    const timer = setTimeout(async () => {
      const result = await answerOf(
        previewNewBillingAction({
          agentId,
          legacy: typed,
          chargedSen: totalSen,
        }),
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
  }, [key, agentId, typed, totalSen]);

  const sentence = answer && answer.key === key ? answer.text : null;
  return (
    <div className={cx("grid gap-2", className)}>
      <Field
        label="Legacy invoice number"
        hint="Optional. Only when the old system billed it already: HT1223."
      >
        <Input
          name={LEGACY_INVOICE_FIELD}
          maxLength={LEGACY_INVOICE_MAX}
          autoComplete="off"
          value={legacy}
          onChange={(event) => setLegacy(event.currentTarget.value)}
        />
      </Field>
      <p className="text-caption text-muted" aria-live="polite">
        {totalSen === null
          ? "What it bills shows once the trips are priced."
          : (sentence ?? "Working out what it bills…")}
      </p>
    </div>
  );
}
