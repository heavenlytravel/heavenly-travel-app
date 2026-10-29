"use client";

import { useConfirm } from "@repo/ui/alert-dialog";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "@repo/console/use-action-form";
import { UserPlus } from "lucide-react";
import { buttonClass } from "../_ui/button";
import { addStaffAction, removeStaffAction } from "./actions";

/** The owner adds a staff account by the email it signs in with. */
export function AddStaffForm() {
  const { pending, error, formProps } = useActionForm(addStaffAction, {
    done: "Added. They see your offers and jobs when they sign in.",
    reset: true,
  });
  return (
    <form {...formProps} className="grid gap-3">
      <Field
        label="Their email"
        hint="The email of their Connect account. Someone without one signs up first."
      >
        <Input name="email" type="email" required autoComplete="off" />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ size: "lg", className: "w-full" })}
      >
        <UserPlus aria-hidden className="size-5" />
        {pending ? "Adding…" : "Add to the team"}
      </button>
      <FormError error={error} />
    </form>
  );
}

/** The owner removes a staff account, after a yes. */
export function RemoveStaffButton({
  memberId,
  email,
}: {
  memberId: string;
  email: string;
}) {
  const [dialog, confirm] = useConfirm();
  const { pending, error, formProps } = useActionForm(removeStaffAction, {
    done: `${email} is removed.`,
    ask: () =>
      confirm({
        title: `Remove ${email}?`,
        description: "They no longer see your offers, jobs or fleet.",
        action: "Remove",
        danger: true,
      }),
  });
  return (
    <form {...formProps} className="grid justify-items-end gap-1">
      <input type="hidden" name="memberId" value={memberId} />
      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ variant: "danger", size: "sm" })}
      >
        Remove
      </button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}
