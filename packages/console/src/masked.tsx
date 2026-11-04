import { PAID_TO_LABELS, type BankFields } from "@repo/db";
import { MaskedText } from "@repo/ui/secret";
import type { ReactNode } from "react";

/**
 * Sensitive details where a record is viewed, not edited (forms stay
 * plain): each blurred until clicked, so the screen can be shown to
 * someone. The read side of ./BankCard. See docs/261103-tour-guide.md,
 * "Pay and bank details".
 */

/** A sensitive value blurred until clicked; "None yet" when empty. */
export function masked(value: string | null, label: string): ReactNode {
  return value ? <MaskedText value={value} label={label} /> : "None yet";
}

/** Where we pay: the bank, the account number blurred, the name on it; or the vendor's account. */
export function bankCell(
  fields: BankFields & { paidToVendor?: boolean },
  vendorName?: string,
): ReactNode {
  if (fields.paidToVendor) {
    return vendorName
      ? `${PAID_TO_LABELS.vendor}, ${vendorName}`
      : PAID_TO_LABELS.vendor;
  }
  if (!fields.bankAccountNumber) return "None yet";
  return (
    <span className="inline-flex flex-wrap gap-x-1.5">
      {fields.bankName}
      <MaskedText value={fields.bankAccountNumber} label="account number" />
      <span className="text-muted">{fields.bankAccountName}</span>
    </span>
  );
}
