"use client";

import { answerOf } from "@repo/ui/action-answer";
import { toast } from "@repo/ui/toast";
import { useActionState, useState } from "react";
import {
  dangerButton,
  Pending,
  secondaryButton,
} from "../../../_components/Page";
import {
  cancelBookingAction,
  cancelTripAction,
  type CancelState,
} from "./actions";

/** What the button and its confirmation say, for the booking or one trip. */
type Words = {
  open: string;
  question: string;
  confirm: string;
  keep: string;
  done: string;
};

/**
 * A cancel button and its confirmation, for the whole booking or one trip
 * of it. `hint` names the deadline as a date: until when it can be
 * cancelled, or when that ended. Past the deadline it is `blocked` and the
 * button shows disabled, so the customer learns the rule instead of
 * wondering where the button went. A cancel that went through says so in
 * a toast; one refused says why under the buttons.
 */
function CancelControl({
  fields,
  action,
  words,
  hint,
  blocked,
}: {
  fields: Record<string, string>;
  action: (previous: CancelState, formData: FormData) => Promise<CancelState>;
  words: Words;
  hint: string;
  blocked: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [state, formAction, pending] = useActionState<CancelState, FormData>(
    async (previous, formData) => {
      const answer = await answerOf(action(previous, formData));
      if (answer === null) toast.success(words.done);
      return answer;
    },
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
          {words.open}
        </button>
        <p className="mt-2 text-center text-[0.85rem] text-slate-500">{hint}</p>
      </>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className="text-[0.95rem] text-slate-700">{words.question}</p>
      <button type="submit" disabled={pending} className={dangerButton}>
        {pending ? <Pending>Cancelling…</Pending> : words.confirm}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(false)}
        className={secondaryButton}
      >
        {words.keep}
      </button>
      {state?.error && (
        <p role="alert" className="text-[0.95rem] text-[#b3261e]">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Cancels the whole booking. */
export function CancelBooking({
  reference,
  hint,
  blocked = false,
}: {
  reference: string;
  hint: string;
  blocked?: boolean;
}) {
  return (
    <CancelControl
      fields={{ reference }}
      action={cancelBookingAction}
      hint={hint}
      blocked={blocked}
      words={{
        open: "Cancel booking",
        question: `Cancel booking ${reference}? This cannot be undone.`,
        confirm: "Yes, cancel this booking",
        keep: "Keep the booking",
        done: "Booking cancelled",
      }}
    />
  );
}

/** Cancels one trip of the booking, the rest standing. */
export function CancelTrip({
  reference,
  itemId,
  position,
  hint,
  blocked = false,
}: {
  reference: string;
  itemId: string;
  /** "Trip 2", as the page numbers it. */
  position: number;
  hint: string;
  blocked?: boolean;
}) {
  return (
    <CancelControl
      fields={{ reference, item: itemId }}
      action={cancelTripAction}
      hint={hint}
      blocked={blocked}
      words={{
        open: `Cancel trip ${position}`,
        question: `Cancel trip ${position}? The rest of the booking goes ahead. This cannot be undone.`,
        confirm: "Yes, cancel this trip",
        keep: "Keep the trip",
        done: "Trip cancelled",
      }}
    />
  );
}
