import type { ConfirmRequest } from "@repo/ui/alert-dialog";
import { startTransition, type FormEvent } from "react";

/**
 * The `onSubmit` of a form that asks first, for a form posting to a
 * `useActionState` action: it holds the submit, asks `request` through
 * `confirm` from `useConfirm`, and on the yes hands the form's fields to
 * `action` in a transition, as the form itself would have. The fields are
 * read before the question, while the form is still there.
 */
export function confirmedSubmit(
  confirm: (request: ConfirmRequest) => Promise<boolean>,
  request: ConfirmRequest,
  action: (formData: FormData) => void,
) {
  return async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (await confirm(request)) startTransition(() => action(formData));
  };
}
