"use client";

import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionState } from "../_lib/action-state";

/**
 * The delete button of a record entered by mistake: a model, a vehicle, a
 * driver. It asks first in an alert dialog, runs the action, a server
 * action bound to the record, and opens `doneHref` once the record is
 * gone; a refusal shows under the button.
 */
export function DeleteRecord({
  label,
  title,
  description,
  action,
  doneHref,
  doneMessage,
}: {
  /** The button and the dialog's action: "Delete vehicle". */
  label: string;
  title: string;
  description: string;
  action: () => Promise<ActionState>;
  doneHref: string;
  doneMessage: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  return (
    <div className="grid justify-items-start gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        className="text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={async () => {
          if (
            !(await confirm({
              title,
              description,
              action: label,
              danger: true,
            }))
          ) {
            return;
          }
          startTransition(async () => {
            const result = await action();
            setError(result?.error ?? null);
            if (result?.error) return;
            toast.success(doneMessage);
            router.push(doneHref);
          });
        }}
      >
        {pending ? "Deleting…" : label}
      </Button>
      {error ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {dialog}
    </div>
  );
}
