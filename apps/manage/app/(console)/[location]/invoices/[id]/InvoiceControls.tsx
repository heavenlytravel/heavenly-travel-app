"use client";

import {
  BILLING_REASON_MAX,
  localDayOf,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  ringgitInputValue,
} from "@repo/db";
import { useActionForm } from "@repo/console/use-action-form";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Input, Textarea } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { ActionDialog } from "../../../../_components/ActionDialog";
import {
  deleteDraftAction,
  issueDraftAction,
  recordPaymentAction,
  reversePaymentAction,
  setDraftLineAction,
  voidInvoiceAction,
} from "../actions";

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

/**
 * "Record payment" on an invoice, or "Record refund" on a credit note:
 * the amount, how, the day, and a note (the bank's reference, who handed
 * the cash in). It starts at what is left, which Finance changes for a
 * part payment. One transfer for three invoices is recorded on each.
 */
export function RecordPaymentControl({
  invoiceId,
  label,
  balanceSen,
  refund,
}: {
  invoiceId: string;
  label: string;
  /** What is left: to pay on an invoice, to give back on a credit note. */
  balanceSen: number;
  refund: boolean;
}) {
  return (
    <ActionDialog
      action={recordPaymentAction}
      label={refund ? "Record refund" : "Record payment"}
      title={refund ? `Refund on ${label}` : `Payment on ${label}`}
      description={
        refund
          ? "Money paid back to the customer, against this credit note."
          : "Money in against this invoice. A part payment leaves the rest owed."
      }
      done={refund ? "Refund recorded." : "Payment recorded."}
      submit={refund ? "Record refund" : "Record payment"}
      hidden={{ invoiceId, ...(refund ? { refund: "true" } : {}) }}
      variant={refund ? "secondary" : "primary"}
      width="md"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (RM)">
          <Input
            name="amount"
            inputMode="decimal"
            required
            autoComplete="off"
            defaultValue={balanceSen > 0 ? ringgitInputValue(balanceSen) : ""}
          />
        </Field>
        <Field label="Day it came in">
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

/**
 * "Void" on an issued document, with why. With payments or credit notes
 * on it, it is voided with its replacement only, issued at once to whoever
 * the bookings are billed to now (fix the agent or the customer's name on
 * the booking first): the box is ticked and fixed.
 */
export function VoidControl({
  invoiceId,
  label,
  mustReissue,
}: {
  invoiceId: string;
  label: string;
  mustReissue: boolean;
}) {
  const [reissue, setReissue] = useState(true);
  return (
    <ActionDialog
      action={voidInvoiceAction}
      label="Void"
      title={`Void ${label}?`}
      description="Its number stays listed as void. Its bookings are billed again by the replacement, or listed as not invoiced yet."
      done={`${label} voided.`}
      submit={reissue || mustReissue ? "Void and reissue" : "Void"}
      hidden={{
        invoiceId,
        ...(reissue || mustReissue ? { reissue: "true" } : {}),
      }}
      danger
      width="md"
    >
      <Field
        label="Reason"
        hint="Kept on the void document and in its history."
      >
        <Textarea
          name="reason"
          rows={2}
          required
          maxLength={BILLING_REASON_MAX}
          placeholder="Billed to the wrong name, wrong agent"
        />
      </Field>
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox
          checked={reissue || mustReissue}
          disabled={mustReissue}
          onChange={(event) => setReissue(event.currentTarget.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="block font-medium text-ink">
            Issue its replacement now
          </span>
          <span className="block text-caption text-muted">
            {mustReissue
              ? "Needed: its payments and credit notes move to the replacement."
              : "The same lines, billed to whoever the bookings are billed to now."}
          </span>
        </span>
      </label>
    </ActionDialog>
  );
}

/** A draft's line ticked or not, saved as it is clicked. */
export function DraftTick({
  invoiceId,
  bookingId,
  label,
  ticked,
}: {
  invoiceId: string;
  bookingId: string;
  label: string;
  ticked: boolean;
}) {
  const { pending, error, formProps } = useActionForm(setDraftLineAction);
  return (
    <form {...formProps} className="grid gap-1">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="ticked" value={ticked ? "false" : "true"} />
      <Checkbox
        aria-label={`Bill ${label} on this invoice`}
        checked={ticked}
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      <FormError error={error} size="xs" />
    </form>
  );
}

/**
 * A draft's Issue and Delete. Issuing numbers it and freezes its amounts.
 * A booking's open invoice is not deleted: it follows its booking, and a
 * credit on it issues as a credit note.
 */
export function DraftActions({
  invoiceId,
  total,
  ticked,
  open = false,
  credit = false,
}: {
  invoiceId: string;
  /** "RM 1,240.00". */
  total: string;
  ticked: number;
  /** A booking's open invoice. */
  open?: boolean;
  /** Its amount is below nothing: a credit to give. */
  credit?: boolean;
}) {
  const [dialog, confirm] = useConfirm();
  const issue = useActionForm(issueDraftAction, {
    ask: () =>
      confirm(
        open
          ? {
              title: credit
                ? "Issue a credit note now?"
                : `Issue this invoice for ${total}?`,
              description: credit
                ? "The credit is issued now, against the booking's invoices, newest first."
                : "It takes its number now and never changes after. Later changes to the booking open a new one.",
              action: credit ? "Issue credit note" : "Issue invoice",
            }
          : {
              title: `Issue this invoice for ${total}?`,
              description: `It takes its number now, for the ${ticked} ticked bookings, and never changes after. The unticked ones wait for the next run.`,
              action: "Issue invoice",
            },
      ),
    done: credit ? "Credit note issued." : "Invoice issued.",
  });
  const remove = useActionForm(deleteDraftAction, {
    ask: () =>
      confirm({
        title: "Delete this draft?",
        description:
          "Nothing was numbered. Its bookings stay not invoiced yet.",
        action: "Delete draft",
        danger: true,
      }),
    done: "Draft deleted.",
  });
  return (
    <>
      {open ? null : (
        <form {...remove.formProps}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <Button type="submit" variant="ghost-danger" pending={remove.pending}>
            Delete draft
          </Button>
        </form>
      )}
      <form {...issue.formProps}>
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <Button type="submit" disabled={ticked === 0} pending={issue.pending}>
          {issue.pending
            ? "Issuing…"
            : credit
              ? "Issue credit note"
              : "Issue invoice"}
        </Button>
      </form>
      <FormError
        error={issue.error ?? remove.error}
        size="xs"
        className="basis-full text-right"
      />
      {dialog}
    </>
  );
}
