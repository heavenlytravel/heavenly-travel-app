"use client";

import { formatMyr, ringgitInputValue } from "@repo/db";
import { Field, Input } from "@repo/ui/field";
import { ActionDialog } from "../../../../_components/ActionDialog";
import { billNowAction } from "../actions";

/**
 * Finance's Issue now on one booking: what it has not been billed yet,
 * issued at once. More to pay is an invoice, for all of it or a part (a
 * deposit), the rest left not invoiced yet; less to pay is credit notes,
 * in full. Never an amount the booking does not hold.
 */
export function BillNowControl({
  bookingId,
  label,
  unbilledSen,
  variant = "secondary",
}: {
  bookingId: string;
  /** "HTB-0042". */
  label: string;
  /** What it has not been billed yet; negative for a credit to give. */
  unbilledSen: number;
  variant?: "secondary" | "primary";
}) {
  if (unbilledSen === 0) return null;
  if (unbilledSen < 0) {
    return (
      <ActionDialog
        action={billNowAction}
        label="Issue credit note"
        title={`Credit ${label} now?`}
        description={`A credit note for ${formatMyr(-unbilledSen)} is issued now, against its invoices, newest first. Record the refund on it if the money goes back.`}
        done="Credit note issued."
        submit="Issue credit note"
        hidden={{ bookingId }}
        variant={variant}
      >
        {null}
      </ActionDialog>
    );
  }
  return (
    <ActionDialog
      action={billNowAction}
      label="Issue now"
      title={`Issue ${label}'s invoice now?`}
      description={`It takes its number now and never changes after. ${formatMyr(unbilledSen)} is due.`}
      done="Invoice issued."
      submit="Issue invoice"
      hidden={{ bookingId }}
      variant={variant}
    >
      <Field
        label="Amount (RM)"
        hint="Less bills part of it, such as a deposit. The rest stays not invoiced yet."
      >
        <Input
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={ringgitInputValue(unbilledSen)}
          required
        />
      </Field>
    </ActionDialog>
  );
}
