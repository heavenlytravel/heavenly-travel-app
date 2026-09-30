"use client";

import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { Sheet } from "@repo/ui/sheet";
import { useActionState, useState } from "react";
import type { ActionState } from "../../_lib/action-state";
import { createZoneAction } from "./actions";

/**
 * "Add zone": a name is all a new zone needs. It starts off, with no
 * districts and no price change; the action opens its page to fill it in.
 */
export function AddZoneButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createZoneAction,
    null,
  );

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add zone</Button>
      <Sheet open={open} onOpenChange={setOpen} title="Add zone">
        <form action={action} className="grid gap-5 p-6 text-left">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Add zone</h2>
            <p className="mt-1 text-sm text-neutral-600">
              The zone starts off. Add its towns on the next page, then turn it
              on.
            </p>
          </div>
          <Field label="Name">
            <Input
              name="name"
              required
              autoFocus
              autoComplete="off"
              placeholder="Ipoh"
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add zone"}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
          {state?.error ? (
            <p aria-live="polite" className="text-sm text-red-700">
              {state.error}
            </p>
          ) : null}
        </form>
      </Sheet>
    </>
  );
}
