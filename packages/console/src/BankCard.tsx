"use client";

import { useState } from "react";
import {
  BANK_FIELD_LABELS,
  BANK_LIMITS,
  MALAYSIAN_BANKS,
  PAID_TO_FIELD,
  PAID_TO_LABELS,
  type BankFields,
} from "@repo/db";
import { Field, Input, Radio } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";
import { Card, CardTitle } from "./Card";

/**
 * The bank details of whoever we pay, as a card of a record's form: a
 * vendor for its vehicles, a driver or a tour guide for their own work.
 * The bank, the account number, as typed, and the name on the account;
 * all three or none. Where the record is viewed, the number is blurred
 * until clicked. A driver or a guide is paid to their own account or to
 * their vendor's (`payee`), which takes none of theirs. One copy for every
 * form that keeps them (`BankFields`, `PayeeFields` in @repo/db).
 */
export function BankCard({
  fields,
  whose,
  payee = false,
}: {
  /** As stored; absent for a new record. */
  fields?: BankFields & { paidToVendor?: boolean };
  /** "the vendor", "the driver", "the guide": whom we pay. */
  whose: string;
  /** Offer "Paid to": their own account or the vendor's. For a driver and a guide. */
  payee?: boolean;
}) {
  const [toVendor, setToVendor] = useState(fields?.paidToVendor ?? false);
  return (
    <Card>
      <CardTitle>
        <span className="inline-flex items-center gap-1.5">
          Bank Details
          <InfoTip
            text={`Where we pay ${whose}. Blurred where it is viewed, until clicked. Leave all three empty until known.`}
          />
        </span>
      </CardTitle>
      <div className="grid gap-4">
        {payee ? (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium text-ink">
              Paid to
            </legend>
            {([false, true] as const).map((vendor) => (
              <label
                key={String(vendor)}
                className="flex items-center gap-2 text-sm"
              >
                <Radio
                  name={PAID_TO_FIELD}
                  value={String(vendor)}
                  checked={toVendor === vendor}
                  onChange={() => setToVendor(vendor)}
                />
                {vendor ? PAID_TO_LABELS.vendor : PAID_TO_LABELS.own}
              </label>
            ))}
            {toVendor ? (
              <p className="text-xs text-muted">
                Their pay goes into the vendor's account, with the vendor's own.
                Nothing to enter here.
              </p>
            ) : null}
          </fieldset>
        ) : null}
        {toVendor ? null : <BankFieldsInputs fields={fields} />}
      </div>
    </Card>
  );
}

/** The bank, the account number and the name on it. */
function BankFieldsInputs({ fields }: { fields?: BankFields }) {
  return (
    <>
      <Field label={BANK_FIELD_LABELS.bankName}>
        <Select
          name="bankName"
          placeholder="Choose the bank"
          defaultValue={fields?.bankName ?? ""}
          options={[
            { value: "", label: "None yet" },
            ...MALAYSIAN_BANKS.map((bank) => ({ value: bank, label: bank })),
          ]}
        />
      </Field>
      <Field label={BANK_FIELD_LABELS.bankAccountNumber}>
        <Input
          name="bankAccountNumber"
          autoComplete="off"
          inputMode="numeric"
          maxLength={BANK_LIMITS.accountDigits.max + 6}
          defaultValue={fields?.bankAccountNumber}
        />
      </Field>
      <Field label={BANK_FIELD_LABELS.bankAccountName}>
        <Input
          name="bankAccountName"
          autoComplete="off"
          maxLength={BANK_LIMITS.accountName}
          defaultValue={fields?.bankAccountName}
        />
      </Field>
    </>
  );
}
