"use client";

import {
  LOCATION_MOVE_LABELS,
  LOCATION_STATE_MOVE,
  type LocationState,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm, type ConfirmRequest } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Button } from "@repo/ui/button";
import { useState, useTransition } from "react";
import { moveLocationStateAction } from "../actions";
import { FormError } from "../../../_components/FormError";
import { errorOf } from "../../../_lib/action-state";

/** What the admin is asked before a move the public notices; null for the rest. */
function questionOf(from: LocationState, name: string): ConfirmRequest | null {
  switch (from) {
    case "draft":
      return {
        title: `Take ${name} live?`,
        description:
          "Its pages become public, and its slug is locked from then on.",
        action: "Go live",
      };
    case "live":
      return {
        title: `Pause ${name}?`,
        description:
          "Its pages stay public and show a notice in place of the search card, so no one can book a trip here. Resume it at any time.",
        action: "Pause",
      };
    case "paused":
      return null;
  }
}

/**
 * The one move a location can make from its state, as a button on the
 * location's Status tab: "Go live", "Pause" or "Resume". "Pause" takes the
 * location off sale, so it stands out in amber, and it and "Go live" ask
 * first in an alert dialog. While its pages do not allow the move the
 * button is disabled.
 */
export function StateMove({
  locationId,
  name,
  state,
  blocked,
}: {
  locationId: string;
  name: string;
  state: LocationState;
  /** The location's pages do not allow the move yet. */
  blocked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  async function move() {
    const question = questionOf(state, name);
    if (question && !(await confirm(question))) return;
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(
          moveLocationStateAction(locationId, LOCATION_STATE_MOVE[state]),
        ),
      );
      setError(refused);
      if (!refused) {
        toast.success(
          state === "draft"
            ? `${name} is live.`
            : state === "live"
              ? `${name} is paused.`
              : `${name} is live again.`,
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant={state === "live" ? "caution" : "primary"}
        disabled={pending || blocked}
        onClick={move}
      >
        {LOCATION_MOVE_LABELS[state]}
      </Button>
      <FormError error={error} />
      {dialog}
    </div>
  );
}
