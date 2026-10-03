"use client";

import {
  LOCATION_MOVE_LABELS,
  LOCATION_STATE_MOVE,
  type LocationState,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { useState, useTransition } from "react";
import { moveLocationStateAction } from "../actions";

/** What the admin is asked before a move the public notices; null for the rest. */
function questionOf(from: LocationState, name: string) {
  switch (from) {
    case "draft":
      return `Take ${name} live? Its pages become public and its slug is locked from then.`;
    case "live":
      return `Pause ${name}? Its pages stay public and show a notice in place of the search card.`;
    case "paused":
      return null;
  }
}

/**
 * The one move a location can make from its state, as a button in the
 * location's header: "Go live", "Pause" or "Resume". While its pages do not
 * allow the move the button is disabled, and the header says what to do
 * first.
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

  function move() {
    const question = questionOf(state, name);
    if (question && !confirm(question)) return;
    startTransition(async () => {
      const result = await moveLocationStateAction(
        locationId,
        LOCATION_STATE_MOVE[state],
      );
      setError(result?.error ?? null);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant={state === "live" ? "secondary" : "primary"}
        disabled={pending || blocked}
        onClick={move}
      >
        {LOCATION_MOVE_LABELS[state]}
      </Button>
      {error ? (
        <p
          aria-live="polite"
          className="max-w-64 text-right text-xs text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
