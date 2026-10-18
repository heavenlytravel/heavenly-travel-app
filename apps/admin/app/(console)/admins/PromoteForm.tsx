"use client";

import type { AdminChange } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import { useActionState } from "react";
import { Card } from "../../_components/Card";
import { AdminFields } from "./AdminFields";
import { setAdminAction } from "./actions";

export function PromoteForm() {
  const [result, action, pending] = useActionState(
    async (previous: AdminChange | null, formData: FormData) => {
      const next = await setAdminAction(previous, formData);
      if (next.ok) toast.success("Admin access granted.");
      return next;
    },
    null,
  );

  return (
    <Card className="mt-6">
      <form action={action}>
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

        {result?.ok === false ? (
          <p aria-live="polite" className="mt-3 text-sm text-red-700">
            {result.error}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
