"use client";

import {
  DRIVER_DOCUMENTS,
  DRIVER_DOCUMENT_LABELS,
  DRIVER_FIELD_LABELS,
  type DriverFields,
} from "@repo/db";
import { BankCard } from "@repo/console/BankCard";
import { Card, CardTitle } from "@repo/console/Card";
import { ExpiryDateField } from "@repo/console/ExpiryDateField";
import { FormFoot } from "@repo/console/FormFoot";
import { useActionForm } from "@repo/console/use-action-form";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { saveOwnDriverAction } from "./actions";

/**
 * What a driver changes of their own record: their name and phone, the
 * expiry of their licences, and where they are paid. Where they are
 * based and what they drive stay with their vendor.
 */
export function DriverSelfForm({ fields }: { fields: DriverFields }) {
  const { pending, error, formProps, leaveDialog } = useActionForm(
    saveOwnDriverAction,
    {
      done: "Your profile is saved.",
      leave: "Your changes to your profile are not saved.",
    },
  );
  return (
    <form {...formProps} className="grid gap-5">
      <Card>
        <CardTitle>You</CardTitle>
        <div className="grid gap-4">
          <Field label={DRIVER_FIELD_LABELS.name}>
            <Input
              name="name"
              required
              autoComplete="name"
              defaultValue={fields.name}
            />
          </Field>
          <Field
            label={DRIVER_FIELD_LABELS.phone}
            hint="Your WhatsApp, with the country code."
          >
            <Input
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              defaultValue={fields.phone}
            />
          </Field>
        </div>
      </Card>
      <Card>
        <CardTitle>Licences</CardTitle>
        <div className="grid gap-4">
          {DRIVER_DOCUMENTS.map((key) => (
            <ExpiryDateField
              key={key}
              name={key}
              label={DRIVER_DOCUMENT_LABELS[key]}
              defaultValue={fields[key]}
            />
          ))}
        </div>
      </Card>
      <BankCard fields={fields} whose="you" payee />
      <FormFoot
        submit={
          <Button type="submit" pending={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        }
        cancelHref="/~/account/driver"
        error={error}
      />
      {leaveDialog}
    </form>
  );
}
