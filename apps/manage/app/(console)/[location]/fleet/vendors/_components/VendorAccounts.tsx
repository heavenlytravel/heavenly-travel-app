"use client";

import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { FormError } from "@repo/ui/form-error";
import { Sheet, SheetHeader } from "@repo/ui/sheet";
import { useState } from "react";
import { AccountFields } from "@repo/console/AccountFields";
import type { ActionState } from "@repo/console/action-state";
import { useActionForm } from "@repo/console/use-action-form";
import { removeVendorStaffAction } from "../actions";

/**
 * SUPER's panels on a vendor's Connect Accounts card: Set or Replace
 * owner, and Add staff. Each takes the email they sign in with, typed
 * twice, the names for an email with no account yet, and a password or
 * none: the account is made now, so they sign in to Connect at once. A
 * refused save keeps what was typed; a saved one closes the panel.
 */
export function VendorAccountButton({
  vendorId,
  label,
  description,
  done,
  action,
  primary = false,
}: {
  vendorId: string;
  label: string;
  description: string;
  done: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(action, {
    done,
    reset: true,
    onDone: () => setOpen(false),
  });

  return (
    <>
      <Button
        size="sm"
        variant={primary ? "primary" : "secondary"}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={label}>
        <form {...formProps} className="grid gap-5 p-6 text-left">
          <input type="hidden" name="id" value={vendorId} />
          <SheetHeader title={label} description={description} />
          <AccountFields
            firstNameRequired={false}
            emailPlaceholder="name@example.com"
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

/** SUPER removes a vendor's staff member, after a yes. */
export function RemoveVendorStaffButton({
  vendorId,
  memberId,
  email,
}: {
  vendorId: string;
  memberId: string;
  email: string;
}) {
  const [dialog, confirm] = useConfirm();
  const { pending, error, formProps } = useActionForm(removeVendorStaffAction, {
    done: `${email} is removed.`,
    ask: () =>
      confirm({
        title: `Remove ${email}?`,
        description:
          "They no longer see the vendor's offers, jobs or fleet in Connect. Their account is deleted too if they never signed in.",
        action: "Remove",
        danger: true,
      }),
  });
  return (
    <form {...formProps} className="grid justify-items-end gap-1">
      <input type="hidden" name="id" value={vendorId} />
      <input type="hidden" name="memberId" value={memberId} />
      <Button type="submit" variant="ghost-danger" size="sm" pending={pending}>
        Remove
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}
