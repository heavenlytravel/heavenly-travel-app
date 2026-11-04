"use client";

import { CONTACT_NAME_MAX_LENGTH } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { useState } from "react";
import { updateContactAction } from "./actions";

/**
 * "Edit" on the Customer card, for Reservation: the name, the phone and
 * the email the booking's emails go to, corrected in place. Open, the
 * form takes the card's width; it closes once saved, and the history
 * says what changed. The account the booking shows under stays.
 */
export function EditContactControl({
  bookingId,
  contact,
}: {
  bookingId: string;
  contact: { name: string; phone: string; email: string };
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(updateContactAction, {
    done: "Customer details saved.",
    onDone: () => setOpen(false),
  });

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Edit
      </Button>
    );
  }
  return (
    <form {...formProps} className="grid w-full gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Field label="Name">
        <Input
          name="name"
          required
          autoComplete="off"
          maxLength={CONTACT_NAME_MAX_LENGTH}
          defaultValue={contact.name}
        />
      </Field>
      <Field label="Phone">
        <Input
          name="phone"
          type="tel"
          required
          autoComplete="off"
          defaultValue={contact.phone}
        />
      </Field>
      <Field label="Email" hint="Where the booking's emails go.">
        <Input
          name="email"
          type="email"
          required
          autoComplete="off"
          defaultValue={contact.email}
        />
      </Field>
      <FormError error={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" pending={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
