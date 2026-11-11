"use client";

import { formatMyr } from "@repo/db";
import { ActionDialog } from "../../../../_components/ActionDialog";
import { billNowAction } from "../actions";

/**
 * Finance's Issue now on one booking, in full: what it has not been billed
 * yet, issued at once. More to pay issues its open invoice, its number
 * kept, or for a credit agent's booking a new invoice; less to pay is
 * credit notes. On an open invoice's page and an agent's, never the
 * booking's: issuing is Finance's.
 */
export function BillNowControl({
  bookingId,
  label,
  unbilledSen,
  variant = "secondary",
}: {
  bookingId: string;
  /** What is issued: "HTI-0012", or the booking for a new invoice, "HTB-0042". */
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
      title={`Issue ${label} now?`}
      description={`It is issued for ${formatMyr(unbilledSen)}, in full, and never changes after: a later change to the booking is billed on a new invoice or a credit note. Its payments stay on it.`}
      done="Invoice issued."
      submit="Issue invoice"
      hidden={{ bookingId }}
      variant={variant}
    >
      {null}
    </ActionDialog>
  );
}
