"use client";

import { answerOf } from "@repo/ui/action-answer";
import { useConfirm, type ConfirmRequest } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { FormError } from "../../_components/FormError";
import { errorOf } from "../../_lib/action-state";
import { setWallAction } from "./actions";

const CONFIRM: Record<"on" | "off", ConfirmRequest> = {
  on: {
    title: "Turn the wall on?",
    description:
      "Each admin will reach only the screens and actions of their teams.",
    action: "Turn on",
  },
  off: {
    title: "Turn the wall off?",
    description: "Every admin will reach every team screen and action.",
    action: "Turn off",
  },
};

/** The one switch for the whole app. The page shows it to SUPER admins only. */
export function WallSwitch({ active }: { active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Switch
        checked={active}
        disabled={pending}
        label="The wall between teams"
        onCheckedChange={async (next) => {
          if (!(await confirm(next ? CONFIRM.on : CONFIRM.off))) return;
          startTransition(async () => {
            const error = errorOf(await answerOf(setWallAction(next)));
            setError(error);
            if (!error) {
              toast.success(next ? "The wall is on." : "The wall is off.");
            }
          });
        }}
      />
      <FormError error={error} size="xs" />
      {dialog}
    </div>
  );
}
