"use client";

import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { PlusIcon } from "@repo/ui/icons";
import { Sheet, SheetHeader } from "@repo/ui/sheet";
import { Switch } from "@repo/ui/switch";
import { useState } from "react";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { AccountFields, NoPasswordNote } from "../AccountFields";
import { AdminFields } from "../AdminFields";
import { createUserAction } from "./actions";

/**
 * "Create an account" in Customers' header: a panel that makes an account
 * on someone's behalf. For an admin who manages staff (`mayMakeStaff`),
 * Make staff, off at first, asks the level and the teams too, and the
 * account is made staff in the same go. A refused create keeps what was
 * typed; a created one closes the panel.
 */
export function CreateUserForm({ mayMakeStaff }: { mayMakeStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const [makeStaff, setMakeStaff] = useState(false);
  const { pending, error, formProps } = useActionForm(createUserAction, {
    done: makeStaff ? "Account created and made staff." : "Account created.",
    reset: true,
    onDone: () => {
      setOpen(false);
      setMakeStaff(false);
    },
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Create an account
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Create an account">
        <form {...formProps} className="grid gap-5 p-6 text-left">
          <SheetHeader
            title="Create an account"
            description="Made in Clerk with the email verified, and nothing is sent to them."
          />
          <AccountFields
            firstNameRequired
            emailPlaceholder="name@example.com"
          />
          <Field label="Phone">
            <Input
              name="phone"
              type="tel"
              autoComplete="off"
              placeholder="+60 12-345 6789"
            />
          </Field>
          {mayMakeStaff ? (
            <div className="grid gap-5 border-t border-edge pt-5">
              <label className="flex items-center gap-3 text-sm">
                <Switch
                  checked={makeStaff}
                  disabled={pending}
                  onCheckedChange={setMakeStaff}
                  label="Make staff"
                />
                <span>
                  <span className="font-medium">Make staff</span>
                  <span className="block text-muted">
                    Give the account a level and teams now.
                  </span>
                </span>
              </label>
              {makeStaff ? (
                <>
                  <input type="hidden" name="staff" value="on" />
                  <AdminFields />
                </>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button type="submit" pending={pending}>
              {pending ? "Creating…" : "Create"}
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
          <NoPasswordNote />
        </form>
      </Sheet>
    </>
  );
}
