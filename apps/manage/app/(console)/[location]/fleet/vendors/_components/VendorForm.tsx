"use client";

import type { LocationName, VendorWithLocations } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { FormError } from "@repo/console/FormError";
import { FORM_WIDTH } from "@repo/console/PageColumn";
import { useActionForm } from "@repo/console/use-action-form";
import { VendorFieldsSection } from "@repo/console/VendorFieldsSection";
import { createVendorAction, updateVendorAction } from "../actions";

/**
 * The admin's form for a vendor, new or existing: the fields Connect's
 * registration asks too (`VendorFieldsSection`). A new one opens its
 * page once saved.
 */
export function VendorForm({
  vendor,
  locations,
  backHref,
}: {
  /** Absent on the "new" page. */
  vendor?: VendorWithLocations;
  locations: LocationName[];
  backHref: string;
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
    <form {...formProps} className={`grid gap-6 ${FORM_WIDTH}`}>
      {vendor ? <input type="hidden" name="id" value={vendor.id} /> : null}

      <VendorFieldsSection vendor={vendor} locations={locations} />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Add vendor" : "Save"}
        </Button>
        <Link
          href={backHref}
          className="text-sm text-slate-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        <FormError error={error} />
      </div>
      {leaveDialog}
    </form>
  );
}
