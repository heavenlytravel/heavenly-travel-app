"use client";

import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { Card } from "../../_components/Card";
import { FormError } from "../../_components/FormError";
import { useActionForm } from "../../_lib/use-action-form";
import { AdminFields } from "./AdminFields";
import { setAdminAction } from "./actions";

export function PromoteForm() {
  const { pending, error, formProps } = useActionForm(setAdminAction, {
    done: "Admin access granted.",
    reset: true,
  });

  return (
    <Card className="mt-6">
      <form {...formProps}>
        <h2 className="text-xl font-semibold tracking-tight">Promote a user</h2>
        <p className="mt-1 text-sm text-neutral-600">
          They must have signed in on the customer site at least once. A REGULAR
          admin needs at least one team.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-4">
          <Field label="Email" className="min-w-60 flex-1">
            <Input
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@heavenlytravel.my"
            />
          </Field>
          <AdminFields />
          <Button type="submit" disabled={pending}>
            {pending ? "Promoting…" : "Promote"}
          </Button>
        </div>

        <FormError error={error} className="mt-3" />
      </form>
    </Card>
  );
}
