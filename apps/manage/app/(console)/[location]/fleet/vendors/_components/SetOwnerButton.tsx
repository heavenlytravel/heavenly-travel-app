"use client";

import { Button } from "@repo/ui/button";
import { FormError } from "@repo/ui/form-error";
import { Sheet, SheetHeader } from "@repo/ui/sheet";
import { useState } from "react";
import { useActionForm } from "@repo/console/use-action-form";
import { AccountFields } from "../../../../../_components/AccountFields";
import { setVendorOwnerAction } from "../actions";

/**
 * SUPER's "Set owner", or "Replace owner" when the vendor has one, on its
 * Connect Accounts card: a panel that takes the email the owner signs in
 * with, typed twice, the names for an email with no account yet, and a
 * password or none. The owner it replaces leaves the vendor, and their
 * account goes when never used, as one made with a typo. A refused save
 * keeps what was typed; a saved one closes the panel.
 */
export function SetOwnerButton({
  vendorId,
  vendorName,
  owner,
}: {
  vendorId: string;
  vendorName: string;
  /** The owner's email, when it has one. */
  owner: string | null;
}) {
  const [open, setOpen] = useState(false);
  const label = owner ? "Replace owner" : "Set owner";
  const { pending, error, formProps } = useActionForm(setVendorOwnerAction, {
    done: "Owner saved.",
    reset: true,
    onDone: () => setOpen(false),
  });

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={label}>
        <form {...formProps} className="grid gap-5 p-6 text-left">
          <input type="hidden" name="id" value={vendorId} />
          <SheetHeader
            title={label}
            description={
              owner
                ? `${owner} stops owning ${vendorName} in Connect. Their account is deleted too if it was never used, as one made with a mistyped email. An email with no account gets one now.`
                : `They sign in to Connect with this email to run ${vendorName}. An email with no account gets one now, so they need no sign-up.`
            }
          />
          <AccountFields
            firstNameRequired={false}
            emailPlaceholder="owner@example.com"
          />
          <div className="flex items-center gap-2">
            <Button type="submit" pending={pending}>
              {pending ? "Saving…" : label}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
          <FormError error={error} />
        </form>
      </Sheet>
    </>
  );
}
