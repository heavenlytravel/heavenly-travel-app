"use client";

import type { HeldBooking } from "@repo/db/server";
import { useConfirm } from "@repo/ui/alert-dialog";
import { useState } from "react";
import { heldBookingsSentence } from "./held-bookings";

/**
 * The question before a vehicle or a driver in service is saved out of
 * it while it holds accepted bookings still to come: their list, and that
 * saving takes it off them. Give `onActiveChange` to the form's "in
 * service" or "active" box, pass `ask` to `useActionForm`, and render
 * `dialog`. Any
 * other save goes ahead without a question.
 */
export function useOutOfServiceAsk({
  name,
  wasActive,
  held,
  action,
}: {
  /** "VLE1234", "Ali bin Abu". */
  name: string;
  /** In service as saved: only taking it out asks. */
  wasActive: boolean;
  held: readonly HeldBooking[];
  /** The answer that goes ahead: "Take out of service". */
  action: string;
}) {
  const [active, setActive] = useState(wasActive);
  const [dialog, confirm] = useConfirm();

  function ask() {
    if (!wasActive || held.length === 0 || active) {
      return Promise.resolve(true);
    }
    return confirm({
      title: `${action}?`,
      description: heldBookingsSentence(
        name,
        held,
        "Saving takes it off them.",
      ),
      action,
    });
  }

  return { onActiveChange: setActive, ask, dialog };
}
