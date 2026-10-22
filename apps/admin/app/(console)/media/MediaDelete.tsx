"use client";

import { plural } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "../../_components/FormError";
import { deleteMediaAction } from "./actions";

/**
 * Deletes images nothing uses, after asking in an alert dialog: one from
 * its card, or every one at once from the head of the screen. The server
 * checks each again and keeps any that is no longer free to go; the toast
 * counts both, and the screen reads again.
 */
export function MediaDelete({
  keys,
  label,
  question,
  description,
}: {
  keys: string[];
  /** The button: "Delete", "Delete 5 unused images". */
  label: string;
  /** The dialog's question: "Delete IMG_3096.jpeg?" */
  question: string;
  description: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  async function remove() {
    const yes = await confirm({
      title: question,
      description,
      action: keys.length === 1 ? "Delete image" : "Delete images",
      danger: true,
    });
    if (!yes) return;
    startTransition(async () => {
      const answer = await answerOf(deleteMediaAction(keys));
      if ("error" in answer) {
        setError(answer.error);
        return;
      }
      setError(null);
      const kept =
        answer.kept > 0
          ? ` ${plural(answer.kept, "image")} ${answer.kept === 1 ? "was" : "were"} kept: in use now.`
          : "";
      toast.success(`Deleted ${plural(answer.deleted, "image")}.${kept}`);
      router.refresh();
    });
  }

  return (
    <div className="grid justify-items-start gap-1">
      <Button variant="danger" size="sm" disabled={pending} onClick={remove}>
        {pending ? "Deleting…" : label}
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </div>
  );
}
