"use client";

import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { FormError } from "@repo/ui/form-error";
import { toast } from "@repo/ui/toast";
import { useActionState, useEffect, useRef, useState } from "react";
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
 * a toast; one refused says why under the buttons. The focus follows the
 * swap: opening puts it on the question, so it is read first and Enter
 * pressed twice does not cancel; keeping puts it back on the button.
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
  const openButton = useRef<HTMLButtonElement>(null);
  const question = useRef<HTMLParagraphElement>(null);
  // Set by a press of either button, so the focus moves once the other
  // part is drawn, and never on the page's first draw.
  const swapped = useRef(false);
  useEffect(() => {
    if (!swapped.current) return;
    swapped.current = false;
    (armed ? question : openButton).current?.focus();
  }, [armed]);

  function arm(next: boolean) {
    swapped.current = true;
    setArmed(next);
  }

  if (!armed || blocked) {
    return (
      <>
        <Button
          ref={openButton}
          variant="outline"
          size="lg"
          disabled={blocked}
          onClick={() => arm(true)}
          className="w-full"
        >
          {words.open}
        </Button>
        <p className="mt-2 text-center text-caption text-muted">{hint}</p>
      </>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {/* Takes the focus as the form opens, a place to read from, not a control. */}
      <p
        ref={question}
        tabIndex={-1}
        className="text-copy text-body outline-none"
      >
        {words.question}
      </p>
      <Button type="submit" variant="destructive" size="lg" pending={pending}>
        {pending ? "Cancelling…" : words.confirm}
      </Button>
      <Button
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={() => arm(false)}
      >
        {words.keep}
      </Button>
      <FormError size="copy" error={state?.error} />
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
