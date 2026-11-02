"use client";

import { useConfirm } from "@repo/ui/alert-dialog";
import { FormError } from "@repo/ui/form-error";
import { AccountFields } from "@repo/console/AccountFields";
import { useActionForm } from "@repo/console/use-action-form";
import { UserPlus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { addStaffAction, removeStaffAction } from "./actions";

/**
 * The owner adds someone to the team by the email they sign in with,
 * typed twice: an email with no account gets one now, named as typed,
 * with the password set here or none, so they sign in at once.
 */
export function AddStaffForm() {
  const { pending, error, formProps } = useActionForm(addStaffAction, {
    done: "Added. They see your offers and jobs when they sign in.",
    reset: true,
  });
  return (
    <form {...formProps} className="grid gap-3">
      <AccountFields
        firstNameRequired={false}
        emailPlaceholder="name@example.com"
      />
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
        description:
          "They no longer see your offers, jobs or fleet. Their account is deleted too if they never signed in.",
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
