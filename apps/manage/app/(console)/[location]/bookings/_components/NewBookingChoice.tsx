"use client";

import { LEGACY_INVOICE_MAX } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Field, Input } from "@repo/ui/field";
import { cx } from "@repo/ui/cx";
import { useEffect, useState } from "react";
import { LEGACY_INVOICE_FIELD } from "../_lib/trip-form";
import { previewNewBillingAction } from "../new/actions";

/**
 * What confirming the booking bills, above its buttons: its open invoice
 * for its total, issued when the trip is done or by Finance, or nothing
 * yet for an agent on credit. Asked of the server as the total or the
 * agent changes. Beside it, the old system's invoice number, a note for
 * the team that bills nothing.
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

  const sentence = answer && answer.key === key ? answer.text : null;
  return (
    <div className={cx("grid gap-2", className)}>
      <Field
        label="Old invoice number"
        hint="Optional. A note for the team, such as HT1223. It bills nothing."
      >
        <Input
          name={LEGACY_INVOICE_FIELD}
          maxLength={LEGACY_INVOICE_MAX}
          autoComplete="off"
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
