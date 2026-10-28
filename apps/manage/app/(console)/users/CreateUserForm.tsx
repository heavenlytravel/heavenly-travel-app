"use client";

import { USER_LIMITS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { Card } from "../../_components/Card";
import { FormError } from "../../_components/FormError";
import { useActionForm } from "../../_lib/use-action-form";
import { createUserAction } from "./actions";

/** Creates an account on someone's behalf: a customer, or staff to promote next. */
export function CreateUserForm() {
  const { pending, error, formProps } = useActionForm(createUserAction, {
    done: "Account created. They sign in with a code sent to their email.",
    reset: true,
  });

  return (
    <Card className="mt-6">
      <form {...formProps}>
        <h2 className="text-xl font-semibold tracking-tight">Create a user</h2>
        <p className="mt-1 text-sm text-slate-600">
          The account is made in Clerk with the email verified and no password,
          and nothing is sent to them. They sign in on the site with a code sent
          to that email. To make them staff, use Make admin on their row.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-4">
          <Field label="Email" className="min-w-60 flex-1">
            <Input
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@example.com"
            />
          </Field>
          <Field label="First name" className="min-w-40 flex-1">
            <Input
              name="firstName"
              required
              autoComplete="off"
              maxLength={USER_LIMITS.name}
            />
          </Field>
          <Field label="Last name" className="min-w-40 flex-1">
            <Input
              name="lastName"
              autoComplete="off"
              maxLength={USER_LIMITS.name}
            />
          </Field>
          <Field label="Phone" className="min-w-40 flex-1">
            <Input
              name="phone"
              type="tel"
              autoComplete="off"
              placeholder="+60 12-345 6789"
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </div>

        <FormError error={error} className="mt-3" />
      </form>
    </Card>
  );
}
