"use client";

import { ADMIN_LEVELS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input, Select } from "@repo/ui/field";
import { useActionState } from "react";
import { setAdminLevelAction } from "./actions";

export function PromoteForm() {
  const [result, action, pending] = useActionState(setAdminLevelAction, null);

  return (
    <form
      action={action}
      className="mt-6 rounded-lg border border-neutral-200 bg-white p-5"
    >
      <h2 className="text-base font-semibold tracking-tight">Promote a user</h2>
      <p className="mt-1 text-sm text-neutral-600">
        They must have signed in on the customer site at least once.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Email" className="min-w-60 flex-1">
          <Input
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="name@heavenlytravel.my"
          />
        </Field>
        <Field label="Level" className="w-36">
          <Select name="level" defaultValue="REGULAR">
            {ADMIN_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </Field>
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
