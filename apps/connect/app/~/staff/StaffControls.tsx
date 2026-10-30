"use client";

import { useConfirm } from "@repo/ui/alert-dialog";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { UserPlus } from "lucide-react";
import { Button } from "@repo/ui/button";
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
      <Button type="submit" size="lg" pending={pending} className="w-full">
        <UserPlus aria-hidden className="size-5" />
        {pending ? "Adding…" : "Add to the team"}
      </Button>
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
      <Button type="submit" variant="danger" size="sm" pending={pending}>
        Remove
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}
