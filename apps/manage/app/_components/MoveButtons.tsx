"use client";

import type { ActionState } from "@repo/console/action-state";
import { errorOf } from "@repo/console/action-state";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { FormError } from "@repo/ui/form-error";
import { ArrowLeftIcon, ArrowRightIcon } from "@repo/ui/icons";
import { toast } from "@repo/ui/toast";
import { Tooltip } from "@repo/ui/tooltip";
import { useState, useTransition } from "react";

/**
 * The arrows on a card that move it one place earlier or later in a list
 * ordered by hand, saved at once: a location's classes, the catalogue's.
 * The first has no way earlier, the last none later. `move` is the
 * action, given the way; its refusal shows under the arrows, a move a
 * toast.
 */
export function MoveButtons({
  name,
  first,
  last,
  move,
}: {
  /** What the card is, as the toast and the buttons' names say it. */
  name: string;
  first: boolean;
  last: boolean;
  move: (by: -1 | 1) => Promise<ActionState>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function moveBy(by: -1 | 1) {
    startTransition(async () => {
      const refused = errorOf(await answerOf(move(by)));
      setError(refused);
      if (!refused) {
        toast.success(`Moved ${name} ${by < 0 ? "earlier" : "later"}.`);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip content="Move earlier">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={first}
          pending={pending}
          aria-label={`Move ${name} earlier`}
          onClick={() => moveBy(-1)}
        >
          <ArrowLeftIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Move later">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={last}
          pending={pending}
          aria-label={`Move ${name} later`}
          onClick={() => moveBy(1)}
        >
          <ArrowRightIcon />
        </Button>
      </Tooltip>
      <FormError error={error} size="xs" />
    </div>
  );
}
