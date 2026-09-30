"use client";

import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useActionState } from "react";
import { AdminFields } from "./AdminFields";
import { setAdminAction } from "./actions";

export function PromoteForm() {
  const [result, action, pending] = useActionState(setAdminAction, null);

  return (
    <form
      action={action}
      className="mt-6 rounded-lg border border-neutral-200 bg-white p-5"
    >
      <h2 className="text-base font-semibold tracking-tight">Promote a user</h2>
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

      <p aria-live="polite" className="mt-3 min-h-5 text-sm">
        {result?.ok === false ? (
          <span className="text-red-700">{result.error}</span>
        ) : result?.ok ? (
          <span className="text-emerald-700">Admin access granted.</span>
        ) : null}
      </p>
    </form>
  );
}
