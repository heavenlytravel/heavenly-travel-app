"use client";

import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "@repo/db";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { OLD_INVOICE_FIELD } from "../_lib/trip-form";
import { invoiceBookingAction, setPaymentAction } from "./actions";

/**
 * Where the invoice's payment stands, set freely for now: pending,
 * partially paid, fully paid or pay later, saved as it is chosen. On an
 * agent's invoice it sets every booking on it, which the hint says. A
 * status no longer in the list shows none chosen, for staff to pick one.
 */
export function PaymentControl({
  bookingId,
  status,
  shared,
}: {
  bookingId: string;
  status: PaymentStatus | null;
  /** The agent's invoice number, when the booking is a line of one. */
  shared: string | null;
}) {
  const [chosen, setChosen] = useState<string>(status ?? "");
  const { error, formProps } = useActionForm(setPaymentAction, {
    done: "Payment status saved.",
  });
  return (
    <form {...formProps} className="grid gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="paymentStatus" value={chosen} />
      <Field
        label="Payment status"
        hint={shared ? `For every booking on ${shared}.` : undefined}
      >
        <Select
          value={chosen}
          onValueChange={(value) => {
            setChosen(value);
            // Saved as it is chosen, once the hidden field holds it.
            requestAnimationFrame(() => formProps.ref.current?.requestSubmit());
          }}
          options={PAYMENT_STATUSES.map((value) => ({
            value,
            label: PAYMENT_STATUS_LABELS[value],
          }))}
        />
      </Field>
      <FormError error={error} />
    </form>
  );
}

/**
 * For a confirmed booking from before invoice numbers: the next number,
 * or an old invoice's typed, as on New booking. An agent's booking joins
 * the agent's invoice for its period, or opens it with the number typed.
 */
export function GiveInvoiceForm({
  bookingId,
  nextInvoice,
  agentName,
}: {
  bookingId: string;
  nextInvoice: string;
  agentName: string | null;
}) {
  const { pending, error, formProps } = useActionForm(invoiceBookingAction, {
    done: "Invoice given.",
  });
  return (
    <form {...formProps} className="grid gap-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Field
        label="Invoice number"
        hint={
          agentName
            ? `Leave empty to add it to ${agentName}'s invoice for the period of its first trip, or to open that invoice with ${nextInvoice}. Opening one invoiced already? Type its number, such as HT1295.`
            : `Leave empty for ${nextInvoice}. Invoiced already? Type its number, such as HT1223.`
        }
      >
        <Input
          name={OLD_INVOICE_FIELD}
          placeholder={nextInvoice}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <FormError error={error} />
      <Button type="submit" size="sm" pending={pending}>
        {pending ? "Giving…" : "Give invoice"}
      </Button>
    </form>
  );
}
