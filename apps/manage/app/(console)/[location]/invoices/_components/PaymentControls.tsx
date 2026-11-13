"use client";

import {
  BILLING_REASON_MAX,
  formatMyr,
  localDayOf,
  parseRinggit,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  ringgitInputValue,
} from "@repo/db";
import { Field, Input, Textarea } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { ActionDialog } from "../../../../_components/ActionDialog";
import { recordPaymentAction, reversePaymentAction } from "../actions";

/** The method chosen, posted under `method`. */
function MethodField({ initial }: { initial: string }) {
  const [method, setMethod] = useState(initial);
  return (
    <Field label="How">
      <input type="hidden" name="method" value={method} />
      <Select
        value={method}
        onValueChange={setMethod}
        options={PAYMENT_METHODS.map((value) => ({
          value,
          label: PAYMENT_METHOD_LABELS[value],
        }))}
      />
    </Field>
  );
}

/** One booking on an agent's month-end invoice, as the payment's For lists it. */
export type PayableBooking = {
  id: string;
  /** "HTB-0042 · Mei Ling". */
  label: string;
  /** What is left on it: to pay, or below nothing to refund. */
  owedSen: number;
};

/** Spread over every booking, the oldest pick-up first. */
const EVERY = "";

/**
 * "Record Payment" on an open or issued invoice, or "Record Refund" on a
 * credit note or an invoice paid over:
 * the amount, how, the day, and a note (the bank's reference, who handed
 * the cash in). It starts at what is left, which Finance changes for a
 * part payment. Each payment is for one booking: the document's own, the
 * booking whose page it is recorded on (`bookingId`), or, on an agent's
 * month-end invoice, the one chosen under For (`bookings`), where one
 * transfer for all of them is spread the oldest pick-up first. More than
 * is left says it will show Refund due, and still saves: money that came
 * in is recorded as it came. One transfer for three invoices is recorded
 * on each.
 */
export function RecordPaymentControl({
  invoiceId,
  label,
  balanceSen,
  refund,
  bookingId,
  bookings,
}: {
  invoiceId: string;
  label: string;
  /** What is left: to pay on an invoice, to give back on a credit note. */
  balanceSen: number;
  refund: boolean;
  /** The booking it is for, recorded from its page. */
  bookingId?: string;
  /** An agent's month-end invoice's bookings, to choose from. */
  bookings?: readonly PayableBooking[];
}) {
  const choices = bookings && bookings.length > 1 ? bookings : null;
  // A refund is one booking's; a payment may be for every booking.
  const first = refund
    ? (choices?.find((b) => b.owedSen < 0) ?? choices?.[0])
    : undefined;
  const [chosen, setChosen] = useState(first?.id ?? EVERY);
  const [amount, setAmount] = useState(() => {
    const start = refund && first ? -first.owedSen : balanceSen;
    return start > 0 ? ringgitInputValue(start) : "";
  });
  const booking = choices?.find((b) => b.id === chosen);
  // What is left on what it pays: one booking's, or the whole document's.
  const owedSen = booking ? booking.owedSen : balanceSen;
  const typed = parseRinggit(amount);
  const overSen = !refund && typed !== null ? typed - Math.max(0, owedSen) : 0;
  return (
    <ActionDialog
      action={recordPaymentAction}
      label={refund ? "Record Refund" : "Record Payment"}
      title={refund ? `Refund on ${label}` : `Payment on ${label}`}
      description={
        refund
          ? "Money paid back to the customer: what was paid over, or what this credit note gives back."
          : "Money in against this invoice. A part payment leaves the rest owed."
      }
      done={refund ? "Refund recorded." : "Payment recorded."}
      submit={refund ? "Record Refund" : "Record Payment"}
      hidden={{
        invoiceId,
        ...(refund ? { refund: "true" } : {}),
        ...(bookingId ? { bookingId } : {}),
      }}
      variant={refund ? "secondary" : "primary"}
      width="md"
    >
      {choices ? (
        <Field
          label="For"
          hint={
            booking
              ? `Left on it: ${formatMyr(booking.owedSen)}.`
              : "Spread over the bookings still owing, the oldest pick-up first."
          }
        >
          <Select
            name="bookingId"
            value={chosen}
            onValueChange={(next) => {
              setChosen(next);
              const owed = choices.find((b) => b.id === next)?.owedSen;
              const start =
                owed === undefined ? balanceSen : refund ? -owed : owed;
              setAmount(start > 0 ? ringgitInputValue(start) : "");
            }}
            options={[
              ...(refund
                ? []
                : [{ value: EVERY, label: "Every Booking, Oldest First" }]),
              ...choices.map((b) => ({ value: b.id, label: b.label })),
            ]}
          />
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Amount (RM)"
          hint={
            overSen > 0
              ? `${formatMyr(overSen)} more than is due: it will show Refund due.`
              : undefined
          }
        >
          <Input
            name="amount"
            inputMode="decimal"
            required
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="Day It Came In">
          <Input
            name="paidOn"
            type="date"
            required
            defaultValue={localDayOf(new Date())}
          />
        </Field>
      </div>
      <MethodField initial="transfer" />
      <Field
        label="Note"
        hint="Optional: the bank reference, or who handed it in."
      >
        <Input name="note" maxLength={200} autoComplete="off" />
      </Field>
    </ActionDialog>
  );
}

/** "Reverse" on a payment entered wrong: struck out with why, never deleted. The right one is recorded anew. */
export function ReversePaymentControl({
  paymentId,
  amount,
}: {
  paymentId: string;
  /** "RM 350.00". */
  amount: string;
}) {
  return (
    <ActionDialog
      action={reversePaymentAction}
      label="Reverse"
      title={`Reverse the payment of ${amount}?`}
      description="It stays listed, struck out, with your reason. Record the right one after."
      done="Payment reversed."
      submit="Reverse payment"
      hidden={{ paymentId }}
      danger
      variant="ghost"
    >
      <Field label="Reason">
        <Textarea
          name="reason"
          rows={2}
          required
          maxLength={BILLING_REASON_MAX}
        />
      </Field>
    </ActionDialog>
  );
}
