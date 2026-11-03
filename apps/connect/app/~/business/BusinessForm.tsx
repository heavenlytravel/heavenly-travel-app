"use client";

import { VENDOR_FIELD_LABELS, VENDOR_LIMITS } from "@repo/db";
import type { VendorWithLocations } from "@repo/db/server";
import { BankCard } from "@repo/console/BankCard";
import { Card, CardTitle } from "@repo/console/Card";
import { useActionForm } from "@repo/console/use-action-form";
import { Button } from "@repo/ui/button";
import { Field, Input, Textarea } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import Link from "next/link";
import { saveBusinessAction } from "./actions";

/**
 * What the owner changes of the business: who the team speaks to, the
 * address, and the bank we pay it into. The rest was checked when it was
 * approved and stays the team's to change.
 */
export function BusinessForm({ vendor }: { vendor: VendorWithLocations }) {
  const { pending, error, formProps } = useActionForm(saveBusinessAction, {
    done: "Business details saved.",
    leave: "Your changes to the business are not saved.",
  });
  return (
    <form {...formProps} className="grid gap-5">
      <Card>
        <CardTitle>Contact</CardTitle>
        <div className="grid gap-4">
          <Field label={VENDOR_FIELD_LABELS.contactName}>
            <Input
              name="contactName"
              required
              autoComplete="off"
              maxLength={VENDOR_LIMITS.contactName}
              defaultValue={vendor.contactName}
            />
          </Field>
          <Field label={VENDOR_FIELD_LABELS.contactPhone}>
            <Input
              name="contactPhone"
              type="tel"
              required
              autoComplete="off"
              defaultValue={vendor.contactPhone}
            />
          </Field>
          <Field label={VENDOR_FIELD_LABELS.contactEmail}>
            <Input
              name="contactEmail"
              type="email"
              autoComplete="off"
              defaultValue={vendor.contactEmail}
            />
          </Field>
          <Field label={VENDOR_FIELD_LABELS.address}>
            <Textarea
              name="address"
              rows={3}
              maxLength={VENDOR_LIMITS.address}
              defaultValue={vendor.address}
            />
          </Field>
        </div>
      </Card>
      <BankCard fields={vendor} whose="your business for its vehicles" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" pending={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/~/business">Cancel</Link>
        </Button>
      </div>
      <FormError error={error} />
    </form>
  );
}
