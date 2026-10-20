"use client";

import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionState } from "../_lib/action-state";

/**
 * The delete button of a record entered by mistake, in the record's
 * header: a vehicle, a driver. It asks first in an alert dialog, which
 * says when to take the record out of use instead, runs the action, a
 * server action bound to the record, and opens `doneHref` once the record
 * is gone; a refusal shows beside the button, before it.
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
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {error ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
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
      {dialog}
    </div>
  );
}
