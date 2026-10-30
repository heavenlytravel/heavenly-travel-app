"use client";

import type { LocationName, VendorWithLocations } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { SCOPE_FIELD } from "@repo/console/fleet-form";
import { FormFoot } from "@repo/console/FormFoot";
import { useActionForm } from "@repo/console/use-action-form";
import { VendorFieldsSection } from "@repo/console/VendorFieldsSection";
import { createVendorAction, updateVendorAction } from "../actions";

/**
 * The admin's form for a vendor, new or existing: the fields Connect's
 * registration asks too (`VendorFieldsSection`). A new one opens its
 * page, in the scope the form was opened in, once saved.
 */
export function VendorForm({
  vendor,
  locations,
  scope,
  cancelHref,
}: {
  /** Absent on the "new" page. */
  vendor?: VendorWithLocations;
  locations: readonly LocationName[];
  /** The scope the form is open in: a slug, or `~`. */
  scope: string;
  cancelHref: string;
}) {
  const isNew = !vendor;
  const { pending, error, formProps, leaveDialog } = useActionForm(
    isNew ? createVendorAction : updateVendorAction,
    {
      done: isNew ? "Vendor added." : "Vendor saved.",
      leave: isNew
        ? "The vendor is not added."
        : "The changes to this vendor are lost.",
    },
  );

  return (
    <form {...formProps} className="grid gap-5">
      {vendor ? <input type="hidden" name="id" value={vendor.id} /> : null}
      <input type="hidden" name={SCOPE_FIELD} value={scope} />

      <VendorFieldsSection vendor={vendor} locations={locations} />

      <FormFoot
        submit={
          <Button type="submit" pending={pending}>
            {pending ? "Saving…" : isNew ? "Add vendor" : "Save"}
          </Button>
        }
        cancelHref={cancelHref}
        error={error}
      />
      {leaveDialog}
    </form>
  );
}
