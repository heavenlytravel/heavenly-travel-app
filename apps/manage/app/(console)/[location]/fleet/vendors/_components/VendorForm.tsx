"use client";

import type { LocationName, VendorWithLocations } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { Card, CardTitle } from "@repo/console/Card";
import { SCOPE_FIELD } from "@repo/console/fleet-form";
import { FormFoot } from "@repo/console/FormFoot";
import { SignInFields } from "@repo/console/SignInFields";
import { useActionForm } from "@repo/console/use-action-form";
import { VendorFieldsSection } from "@repo/console/VendorFieldsSection";
import { createVendorAction, updateVendorAction } from "../actions";

/**
 * The admin's form for a vendor, new or existing: the fields Connect's
 * registration asks too (`VendorFieldsSection`), and for a new one the
 * email its owner signs in to Connect with, typed twice, and a password
 * or none. A new one opens its page, in the scope the form was opened in,
 * once saved. An existing one's owner is SUPER's, on its page.
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

      {isNew ? (
        <Card>
          <CardTitle description="The owner signs in to Connect with this email to accept jobs and keep the vendor's vehicles and drivers. Their account is made now, named after the contact, so they need no sign-up. Leave it empty for a vendor not on Connect: a SUPER admin can set the owner later.">
            Connect Owner
          </CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner's email">
              <Input
                name="email"
                type="email"
                autoComplete="off"
                placeholder="owner@example.com"
              />
            </Field>
            <SignInFields required={false} placeholder="owner@example.com" />
          </div>
        </Card>
      ) : null}

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
