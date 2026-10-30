"use client";

import { USER_LIMITS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { PlusIcon } from "@repo/ui/icons";
import { Sheet, SheetHeader } from "@repo/ui/sheet";
import { useState } from "react";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "../../../../_lib/use-action-form";
import { createUserAction } from "./actions";

/**
 * "Create an account" in Customers' header: a panel that makes an account
 * on someone's behalf, a customer, or staff to promote next. A refused
 * create keeps what was typed; a created one closes the panel.
 */
export function CreateUserForm() {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(createUserAction, {
    done: "Account created. They sign in with a code sent to their email.",
    reset: true,
    onDone: () => setOpen(false),
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
            description="The account is made in Clerk with the email verified and no password, and nothing is sent to them. They sign in on the site with a code sent to that email. To make them staff, use Promote to staff on their row."
          />
          <Field label="Email">
            <Input
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@example.com"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input
                name="firstName"
                required
                autoComplete="off"
                maxLength={USER_LIMITS.name}
              />
            </Field>
            <Field label="Last name">
              <Input
                name="lastName"
                autoComplete="off"
                maxLength={USER_LIMITS.name}
              />
            </Field>
          </div>
          <Field label="Phone">
            <Input
              name="phone"
              type="tel"
              autoComplete="off"
              placeholder="+60 12-345 6789"
            />
          </Field>
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
        </form>
      </Sheet>
    </>
  );
}
