"use client";

import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { Sheet, SheetHeader } from "@repo/ui/sheet";
import { useState } from "react";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { AccountFields, NoPasswordNote } from "./AccountFields";
import { AdminFields } from "./AdminFields";
import { addStaffAction } from "./actions";

/**
 * "Add admin" in Admin's header: a panel that takes an email, the names,
 * the level and the teams. An email with an account is promoted, its
 * names left as they are; one without gets an account first, as
 * Customers makes it. A refused add keeps what was typed; an added one
 * closes the panel.
 */
export function AddStaffButton() {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(addStaffAction, {
    done: "Admin added.",
    reset: true,
    onDone: () => setOpen(false),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Add admin
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Add admin">
        <form {...formProps} className="grid gap-5 p-6 text-left">
          <SheetHeader
            title="Add admin"
            description="An email with an account is promoted, its names left as they are. One without gets an account first."
          />
          <AccountFields
            firstNameRequired={false}
            emailPlaceholder="name@heavenlytravel.my"
          />
          <AdminFields />
          <div className="flex items-center gap-2">
            <Button type="submit" pending={pending}>
              {pending ? "Adding…" : "Add"}
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
