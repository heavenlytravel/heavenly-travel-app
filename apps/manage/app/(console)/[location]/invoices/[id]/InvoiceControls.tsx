"use client";

import { BILLING_REASON_MAX } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Textarea } from "@repo/ui/field";
import { useState } from "react";
import { ActionDialog } from "../../../../_components/ActionDialog";
import {
  billAloneAction,
  issueMonthEndAction,
  voidInvoiceAction,
} from "../actions";

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
      submit={reissue || mustReissue ? "Void and Reissue" : "Void"}
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

/**
 * Finance's Issue on an agent's open month-end invoice: once its period
 * has ended, each booking's line is frozen at what it has not been billed
 * yet, and it is due the agent's days to pay from now. Before then, the
 * button says when.
 */
export function IssueMonthEndControl({
  invoiceId,
  label,
  total,
  ready,
  period,
}: {
  invoiceId: string;
  /** "HTI-0012". */
  label: string;
  /** "RM 1,240.00". */
  total: string;
  /** Its period has ended. */
  ready: boolean;
  /** "1–15 Nov 2026". */
  period: string;
}) {
  if (!ready) {
    return (
      <Button variant="secondary" disabled>
        Issue After {period}
      </Button>
    );
  }
  return (
    <ActionDialog
      action={issueMonthEndAction}
      label="Issue Invoice"
      title={`Issue ${label} for ${total}?`}
      description="Each booking on it is billed what it has not been billed yet, as it stands now. It never changes after: a later change to a booking goes on the agent's next month-end invoice, or a credit note."
      done="Invoice issued."
      submit="Issue Invoice"
      hidden={{ invoiceId }}
      variant="primary"
    >
      {null}
    </ActionDialog>
  );
}

/**
 * "Bill on Its Own" on a booking of an agent's open month-end invoice:
 * it leaves for an invoice of its own, still billed to the agent, and
 * stays on its own after.
 */
export function BillAloneControl({
  bookingId,
  label,
}: {
  bookingId: string;
  /** "HTB-0042". */
  label: string;
}) {
  return (
    <ActionDialog
      action={billAloneAction}
      label="Bill on Its Own"
      title={`Bill ${label} on its own?`}
      description="It leaves this invoice for an invoice of its own, still billed to the agent and due by the agent's days to pay. It stays on its own after: later changes are billed on it, not on a month-end invoice."
      done="Booking moved to its own invoice."
      submit="Bill on its own"
      hidden={{ bookingId }}
      variant="ghost"
    >
      {null}
    </ActionDialog>
  );
}
