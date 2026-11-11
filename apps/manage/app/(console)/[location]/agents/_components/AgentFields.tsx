"use client";

import {
  BUSINESS_FIELD_LABELS,
  BUSINESS_LIMITS,
  MAX_DAYS_TO_PAY,
  PAYMENT_TERMS,
  PAYMENT_TERMS_HINTS,
  PAYMENT_TERMS_LABELS,
  type BusinessProfile,
  type PaymentTerms,
} from "@repo/db";
import { Field, Input, Radio, Textarea } from "@repo/ui/field";
import { useState } from "react";

/**
 * Who an agent is and who the team speaks to, as Add agent, the agent's
 * page and the booking form's Add an agent ask it: two columns from `sm`,
 * one on a phone. The billing email and address go on its invoices.
 */
export function AgentProfileFields({
  profile,
}: {
  profile: BusinessProfile | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={BUSINESS_FIELD_LABELS.name}>
        <Input
          name="name"
          required
          maxLength={BUSINESS_LIMITS.name}
          autoComplete="organization"
          defaultValue={profile?.name}
        />
      </Field>
      <Field label={BUSINESS_FIELD_LABELS.registrationNo} hint="Optional.">
        <Input
          name="registrationNo"
          maxLength={BUSINESS_LIMITS.registrationNo}
          autoComplete="off"
          defaultValue={profile?.registrationNo}
        />
      </Field>
      <Field label={BUSINESS_FIELD_LABELS.contactName}>
        <Input
          name="contactName"
          required
          maxLength={BUSINESS_LIMITS.contactName}
          autoComplete="name"
          defaultValue={profile?.contactName}
        />
      </Field>
      <Field label={BUSINESS_FIELD_LABELS.contactPhone}>
        <Input
          name="contactPhone"
          type="tel"
          required
          autoComplete="tel"
          defaultValue={profile?.contactPhone}
        />
      </Field>
      <Field
        label={BUSINESS_FIELD_LABELS.contactEmail}
        hint="Invoices are sent here."
        className="sm:col-span-2"
      >
        <Input
          name="contactEmail"
          type="email"
          required
          autoComplete="email"
          defaultValue={profile?.contactEmail}
        />
      </Field>
      <Field
        label={BUSINESS_FIELD_LABELS.address}
        hint="Optional. Printed on its invoices."
        className="sm:col-span-2"
      >
        <Textarea
          name="address"
          rows={2}
          maxLength={BUSINESS_LIMITS.address}
          defaultValue={profile?.address}
        />
      </Field>
    </div>
  );
}

/**
 * How an agent pays: no credit, billed per booking, or monthly or twice a
 * month, billed by the month-end run; and its days to pay, which set each
 * invoice's due date. A choice each with what it means under it.
 */
export function PaymentTermsFields({
  terms,
  daysToPay,
}: {
  terms: PaymentTerms;
  daysToPay: number;
}) {
  const [chosen, setChosen] = useState<PaymentTerms>(terms);
  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">
          {BUSINESS_FIELD_LABELS.paymentTerms}
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PAYMENT_TERMS.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-2.5 rounded-control border border-edge p-3 text-sm has-checked:border-brand has-checked:bg-brand-tint"
            >
              <Radio
                name="paymentTerms"
                value={value}
                checked={chosen === value}
                onChange={() => setChosen(value)}
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="font-semibold text-ink">
                  {PAYMENT_TERMS_LABELS[value]}
                </span>
                <span className="text-caption text-muted">
                  {PAYMENT_TERMS_HINTS[value]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label={BUSINESS_FIELD_LABELS.daysToPay}
        hint="From the invoice's date to when it is due, and shows Overdue."
        className="max-w-48"
      >
        <Input
          name="daysToPay"
          inputMode="numeric"
          required
          pattern="\d{1,3}"
          maxLength={3}
          autoComplete="off"
          defaultValue={String(daysToPay)}
          title={`0 to ${MAX_DAYS_TO_PAY}`}
        />
      </Field>
    </div>
  );
}
