"use client";

import { formatMyr } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Notice } from "@repo/ui/notice";
import { useEffect, useState } from "react";
import { billingPreviewAction } from "../[id]/actions";

/**
 * What saving would bill at a new total, asked as the amounts change:
 * "Saving issues HTI-0013 for RM 90.00." Null while there is no total to
 * ask about, or the answer is on its way.
 */
function useBillingPreview(bookingId: string, chargedSen: number | null) {
  const [answer, setAnswer] = useState<{
    for: number;
    sentence: string;
  } | null>(null);
  useEffect(() => {
    if (chargedSen === null || chargedSen < 0) return;
    let live = true;
    const timer = setTimeout(async () => {
      const result = await answerOf(
        billingPreviewAction(bookingId, chargedSen),
      );
      if (live && "sentence" in result)
        setAnswer({ for: chargedSen, sentence: result.sentence });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [bookingId, chargedSen]);
  return chargedSen !== null && answer?.for === chargedSen
    ? answer.sentence
    : null;
}

/**
 * How a change ends, wherever it is made (a dialog, the amend, an added
 * trip): the booking's total before and after, and what saving bills.
 * Nothing while the new total is not known.
 */
export function BillingLine({
  bookingId,
  nowSen,
  chargedSen,
}: {
  bookingId: string;
  /** What the booking charges now. */
  nowSen: number;
  /** What it charges once saved; null while it is not known. */
  chargedSen: number | null;
}) {
  const sentence = useBillingPreview(bookingId, chargedSen);
  if (chargedSen === null) return null;
  const difference = chargedSen - nowSen;
  return (
    <Notice tone="info">
      <span className="block font-semibold tabular-nums">
        Booking Total {formatMyr(nowSen)} → {formatMyr(chargedSen)}
        {difference !== 0 ? (
          <span className="font-normal">
            {" "}
            ({difference > 0 ? "+" : "−"}
            {formatMyr(Math.abs(difference))})
          </span>
        ) : null}
      </span>
      <span className="block">
        {sentence ?? "Working out what saving bills…"}
      </span>
    </Notice>
  );
}
