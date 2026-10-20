"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./button.js";
import { ModalBody, useModal } from "./modal.js";

/** What an alert dialog asks: the question, what follows from it, and its two answers. */
export type ConfirmRequest = {
  /** The question: "Pause Langkawi?" */
  title: string;
  /** What going ahead does. */
  description?: ReactNode;
  /** The button that goes ahead, named for what it does: "Pause", "Delete location". */
  action: string;
  /** The button that keeps things as they are; "Cancel" when left out. */
  cancel?: string;
  /** Going ahead deletes or loses something for good: the action button is red. */
  danger?: boolean;
};

/**
 * A question that interrupts, after shadcn's alert dialog: in the middle of
 * a dimmed page, the question and what follows from it, then "Cancel" and
 * the action. Unlike a `Dialog` it has no cross and a click beside it does
 * nothing: the admin answers it. Escape answers "Cancel", and "Cancel" has
 * the focus when it opens, so Enter never goes ahead by accident. Built on
 * the native `<dialog>`. Open while `request` is set; most callers use
 * `useConfirm` rather than this.
 */
export function AlertDialog({
  request,
  onAnswer,
}: {
  request: ConfirmRequest | null;
  /** True for the action, false for "Cancel" and Escape. */
  onAnswer: (goAhead: boolean) => void;
}) {
  const open = request !== null;
  const ref = useModal(open);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={request?.description ? descriptionId : undefined}
      // Closed by the browser, on Escape; a close that follows an answer
      // comes after `request` is cleared, and is not a second answer.
      onClose={() => {
        if (open) onAnswer(false);
      }}
      className="ui:m-auto ui:max-h-none ui:w-[min(30rem,92vw)] ui:overflow-hidden ui:rounded-xl ui:border ui:border-neutral-200 ui:bg-white ui:p-0 ui:text-inherit ui:shadow-[0_22px_55px_rgba(9,43,39,0.25)] ui:backdrop:bg-[#082f2b]/45"
    >
      <ModalBody open={open} className="ui:max-h-[90dvh]">
        {request ? (
          <div className="ui:grid ui:gap-5 ui:p-6">
            <div className="ui:grid ui:gap-2">
              <h2
                id={titleId}
                className="ui:text-lg ui:font-semibold ui:tracking-tight"
              >
                {request.title}
              </h2>
              {request.description ? (
                <div
                  id={descriptionId}
                  className="ui:text-sm ui:text-neutral-600"
                >
                  {request.description}
                </div>
              ) : null}
            </div>
            {/* "Cancel" first, so the browser gives it the focus; reversed on a phone, the action on top. */}
            <div className="ui:flex ui:flex-col-reverse ui:gap-2 ui:sm:flex-row ui:sm:justify-end">
              <Button variant="secondary" onClick={() => onAnswer(false)}>
                {request.cancel ?? "Cancel"}
              </Button>
              <Button
                variant={request.danger ? "destructive" : "primary"}
                onClick={() => onAnswer(true)}
              >
                {request.action}
              </Button>
            </div>
          </div>
        ) : null}
      </ModalBody>
    </dialog>
  );
}

/**
 * The console's stand-in for the browser's `confirm()`: render `dialog`
 * once, then `await confirm({ title, action })` where a move needs a yes;
 * it resolves true for the action and false for "Cancel". A second
 * question while one is open answers the first "Cancel".
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolveRef = useRef<((goAhead: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmRequest) => {
    resolveRef.current?.(false);
    setRequest(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const answer = useCallback((goAhead: boolean) => {
    resolveRef.current?.(goAhead);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  const dialog = <AlertDialog request={request} onAnswer={answer} />;
  return [dialog, confirm] as const;
}
