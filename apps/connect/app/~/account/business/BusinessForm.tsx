"use client";

import { VENDOR_FIELD_LABELS, vendorFieldsOf } from "@repo/db";
import type { VendorWithLocations } from "@repo/db/server";
import { BankCard } from "@repo/console/BankCard";
import { Card, CardTitle } from "@repo/console/Card";
import { FormFoot } from "@repo/console/FormFoot";
import { useActionForm } from "@repo/console/use-action-form";
import {
  VendorDetailsFields,
  VendorLocationChecks,
} from "@repo/console/VendorFieldsSection";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { saveBusinessAction } from "./actions";

/**
 * What the owner changes of the business: who it is (company or
 * individual, its name and registration), who the team speaks to, the
 * address, the locations it serves and the bank we pay it into. What it
 * offers stays the team's to change, as the fields the staff form has
 * (`VendorDetailsFields`).
 */
export function BusinessForm({
  vendor,
  locations,
}: {
  vendor: VendorWithLocations;
  /** The locations it may serve: those taking registrations, and its own. */
  locations: readonly { id: string; name: string }[];
}) {
  const { pending, error, formProps, leaveDialog } = useActionForm(
    saveBusinessAction,
    {
      done: "Business details saved.",
      leave: "Your changes to the business are not saved.",
    },
  );
  const fields = vendorFieldsOf(vendor);
  return (
    <form {...formProps} className="grid gap-5">
      <Card>
        <CardTitle>Details</CardTitle>
        <VendorDetailsFields fields={fields} />
      </Card>
      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            {VENDOR_FIELD_LABELS.locationIds}
            <InfoTip text="Each of your vehicles and drivers is based at one of these. A location where one is based stays ticked." />
          </span>
        </CardTitle>
        <VendorLocationChecks
          locations={locations}
          served={new Set(fields.locationIds)}
        />
      </Card>
      <BankCard fields={vendor} whose="your business for its vehicles" />
      <FormFoot
        submit={
          <Button type="submit" pending={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        }
        cancelHref="/~/account/business"
        error={error}
      />
      {leaveDialog}
    </form>
  );
}
