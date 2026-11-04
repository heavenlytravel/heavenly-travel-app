"use client";

import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { OLD_INVOICE_FIELD } from "../_lib/trip-form";
import { invoiceBookingAction, setPaymentAction } from "./actions";

/**
 * Paid or unpaid, switched freely for now: one button to the other. On an
 * agent's invoice it changes every booking on it, which the button says.
 */
export function PaymentControl({
  bookingId,
  status,
  shared,
}: {
  bookingId: string;
  status: PaymentStatus;
  /** The agent's invoice number, when the booking is a line of one. */
  shared: string | null;
}) {
  const next: PaymentStatus = status === "paid" ? "unpaid" : "paid";
  const { pending, error, formProps } = useActionForm(setPaymentAction, {
    done: `Invoice marked ${PAYMENT_STATUS_LABELS[next].toLowerCase()}.`,
  });
  return (
    <form {...formProps} className="grid gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="paymentStatus" value={next} />
      <Button type="submit" variant="secondary" size="sm" pending={pending}>
        Mark {PAYMENT_STATUS_LABELS[next].toLowerCase()}
      </Button>
      {shared ? (
        <p className="text-xs text-muted">For every booking on {shared}.</p>
      ) : null}
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
