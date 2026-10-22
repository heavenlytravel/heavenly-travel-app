"use client";

import type { DeleteImpact } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { errorOf, type ActionState } from "../_lib/action-state";
import { FormError } from "./FormError";

/**
 * What a delete takes, a line each, as the server worked it out
 * (@repo/db's delete-impact), and a note under it: the dialog's body, and
 * a delete card's when the card says it before it is asked.
 */
export function ImpactList({
  impact,
  note,
  className,
}: {
  impact: DeleteImpact;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cx("grid gap-2", className)}>
      {impact.lines.length > 0 ? (
        <ul className="grid list-disc gap-1 pl-5">
          {impact.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {note ? <p>{note}</p> : null}
    </div>
  );
}

/** Where the button stands: a record's header, a row of a list, a card or a bar. */
type Look = "header" | "row" | "card";

/**
 * The one way the console deletes. The button asks in an alert dialog
 * that lists what the delete takes (`impact`) and, for one that reaches
 * past the record, asks for its name to be typed. The action, bound to
 * the record, gets what the admin saw and typed: the server works the
 * impact out again and refuses when it changed, and then the page reads
 * again so a second try shows it as it stands. A refusal shows beside the
 * button; a delete done ends with a toast, then opens the page the action
 * names, or reads this one again.
 */
export function DeleteButton({
  label,
  confirmLabel = label,
  pendingLabel = "Deleting…",
  ariaLabel,
  title,
  impact,
  note,
  action,
  doneMessage,
  doneHref,
  look = "card",
  disabled = false,
  onDeleted,
}: {
  /** The button: "Delete vehicle", "Remove". */
  label: string;
  /** The dialog's action, when it says more than the button: "Remove zone". */
  confirmLabel?: string;
  /** The button while the delete runs. */
  pendingLabel?: string;
  /** The button's name for a screen reader, when its label says too little: "Remove the zone KLIA". */
  ariaLabel?: string;
  /** The dialog's question: "Delete KV589E?" */
  title: string;
  impact: DeleteImpact;
  /** A sentence under the list: when to do something else instead. */
  note?: string;
  action: (seen: string[], typed: string | null) => Promise<ActionState>;
  doneMessage: string;
  /** The page a delete done opens, when the action names none: the record's list. */
  doneHref?: string;
  look?: Look;
  disabled?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  async function remove() {
    const yes = await confirm({
      title,
      description: <ImpactList impact={impact} note={note} />,
      action: confirmLabel,
      danger: true,
      typeToConfirm: impact.confirmWith ?? undefined,
    });
    if (!yes) return;
    startTransition(async () => {
      const answer = await answerOf(action(impact.lines, impact.confirmWith));
      const refused = errorOf(answer);
      setError(refused);
      if (refused) {
        // What the delete takes may have changed: read it again.
        router.refresh();
        return;
      }
      toast.success(doneMessage);
      onDeleted?.();
      const next = answer && "href" in answer ? answer.href : doneHref;
      if (next) router.push(next);
      else router.refresh();
    });
  }

  const button = (
    <Button
      variant={
        look === "card" ? "danger" : look === "row" ? "ghost" : "secondary"
      }
      size={look === "header" ? undefined : "sm"}
      disabled={disabled || pending}
      aria-label={ariaLabel}
      className={
        look === "card"
          ? undefined
          : "text-red-700 hover:bg-red-50 hover:text-red-800"
      }
      onClick={remove}
    >
      {pending ? pendingLabel : label}
    </Button>
  );

  if (look === "header") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <FormError error={error} />
        {button}
        {dialog}
      </div>
    );
  }
  return (
    <div
      className={cx(
        "flex flex-col gap-1",
        look === "row" ? "items-end" : "items-start",
      )}
    >
      {button}
      <FormError error={error} size="xs" />
      {dialog}
    </div>
  );
}
