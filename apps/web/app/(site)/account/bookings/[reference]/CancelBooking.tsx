"use client";

import { useActionState, useState } from "react";
import { dangerButton, secondaryButton } from "../../../_components/Page";
import { cancelBookingAction, type CancelState } from "./actions";

/**
 * The cancel button and its confirmation. `hint` names the deadline as a
 * date: until when the booking can be cancelled, or when that ended. Past
 * the deadline the booking is `blocked` and the button shows disabled, so
 * the customer learns the rule instead of wondering where the button went.
 */
export function CancelBooking({
  reference,
  hint,
  blocked = false,
}: {
  reference: string;
  hint: string;
  blocked?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState<CancelState, FormData>(
    cancelBookingAction,
    null,
  );

  if (!armed || blocked) {
    return (
      <>
        <button
          type="button"
          disabled={blocked}
          onClick={() => setArmed(true)}
          className={`${secondaryButton} w-full`}
        >
          Cancel booking
        </button>
        <p className="mt-2 text-center text-[0.85rem] text-[#67726f]">{hint}</p>
      </>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="reference" value={reference} />
      <p className="text-[0.95rem] text-[#324844]">
        Cancel booking {reference}? This cannot be undone.
      </p>
      <button type="submit" disabled={pending} className={dangerButton}>
        {pending ? "Cancelling…" : "Yes, cancel this booking"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(false)}
        className={secondaryButton}
      >
        Keep the booking
      </button>
      {state?.error && (
        <p role="alert" className="text-[0.95rem] text-[#b3261e]">
          {state.error}
        </p>
      )}
    </form>
  );
}
