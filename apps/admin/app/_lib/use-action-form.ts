"use client";

import { answerOf, UNANSWERED_MESSAGE } from "@repo/ui/action-answer";
import { toast } from "@repo/ui/toast";
import { showFieldError } from "@repo/ui/validation";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useRef, type FormEvent } from "react";
import type { ActionState } from "./action-state";

/** What the form shows of its last answer: the sentence for beside the button, when no field shows it. */
type FormState = { error: string | null };

/**
 * A form posting to a server action, as every form of the console does:
 *
 * - It is submitted in a transition, not through the form's `action`, so
 *   React does not reset it once the action answers: a refused save
 *   keeps everything typed.
 * - With `ask`, it asks first, through `confirm` from `useConfirm`, and
 *   posts only on the yes.
 * - A refusal about one field shows under that field as the browser's
 *   own checks show theirs, the field marked and given the focus; any
 *   other refusal is `error`, for beside the submit button.
 * - A save that went through shows `done` in a toast, clears the form
 *   when `reset` (a form that adds one more: a note, an admin), calls
 *   `onDone` and opens the page the action answered, if any.
 * - An action that does not answer, the network down or the server
 *   failing, says so in `error` rather than showing the error page.
 *
 * Spread `formProps` on the `<form>`.
 */
export function useActionForm(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
  {
    ask,
    done,
    reset = false,
    onDone,
  }: {
    /** The question before posting; false keeps the form as it is. */
    ask?: () => Promise<boolean>;
    /** The toast when the action goes through: "Vehicle saved." */
    done?: string;
    reset?: boolean;
    onDone?: () => void;
  } = {},
) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const answer = await answerOf(action(null, formData));
      if (answer && "error" in answer) {
        const atField =
          "field" in answer && answer.field
            ? showFieldError(form.current, answer.field, answer.error)
            : false;
        return { error: atField ? null : answer.error || UNANSWERED_MESSAGE };
      }
      if (done) toast.success(done);
      if (reset) form.current?.reset();
      onDone?.();
      if (answer && "href" in answer) router.push(answer.href);
      return { error: null };
    },
    { error: null },
  );

  return {
    pending,
    error: state.error,
    formProps: {
      ref: form,
      onSubmit: async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Read before the question, while the form is still there.
        const formData = new FormData(event.currentTarget);
        if (ask && !(await ask())) return;
        startTransition(() => dispatch(formData));
      },
    },
  };
}
