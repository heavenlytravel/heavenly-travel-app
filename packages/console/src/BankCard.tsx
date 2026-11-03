"use client";

import {
  BANK_FIELD_LABELS,
  BANK_LIMITS,
  MALAYSIAN_BANKS,
  type BankFields,
} from "@repo/db";
import { Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";
import { Card, CardTitle } from "./Card";

/**
 * The bank details of whoever we pay, as a card of a record's form: a
 * vendor for its vehicles, a driver or a tour guide for their own work.
 * The bank, the account number, as typed, and the name on the account;
 * all three or none. Where the record is viewed, the number is blurred
 * until clicked. One copy for every form that
 * keeps them (`BankFields` in @repo/db).
 */
export function BankCard({
  fields,
  whose,
}: {
  /** As stored; absent for a new record. */
  fields?: BankFields;
  /** "the vendor", "the driver", "the guide": whom we pay. */
  whose: string;
}) {
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
      </div>
    </Card>
  );
}
