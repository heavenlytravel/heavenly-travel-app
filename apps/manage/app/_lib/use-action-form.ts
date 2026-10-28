"use client";

import { answerOf, UNANSWERED_MESSAGE } from "@repo/ui/action-answer";
import { toast } from "@repo/ui/toast";
import { showFieldError } from "@repo/ui/validation";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { ActionState } from "./action-state";
import { useLeaveGuard } from "./use-leave-guard";

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
 * - With `leave`, saying what leaving loses, a link away while the form
 *   has unsaved edits asks first, through `useLeaveGuard`. A change
 *   typed or picked marks it; `markDirty` marks one made otherwise,
 *   a photo moved.
 *
 * Spread `formProps` on the `<form>` and render `leaveDialog`.
 */
export function useActionForm(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
  {
    ask,
    done,
    reset = false,
    onDone,
    leave,
  }: {
    /** The question before posting; false keeps the form as it is. */
    ask?: () => Promise<boolean>;
    /** The toast when the action goes through: "Vehicle saved." */
    done?: string;
    reset?: boolean;
    onDone?: () => void;
    /** What leaving with unsaved edits loses: "The vehicle is not added." */
    leave?: string;
  } = {},
) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const leaveDialog = useLeaveGuard(leave !== undefined && dirty, leave ?? "");
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
      setDirty(false);
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
    markDirty: () => setDirty(true),
    leaveDialog,
    formProps: {
      ref: form,
      onInput: () => setDirty(true),
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
