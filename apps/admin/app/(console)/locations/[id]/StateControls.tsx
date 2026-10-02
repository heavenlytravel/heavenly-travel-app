"use client";

import type { LocationState } from "@repo/db";
import { Button } from "@repo/ui/button";
import { useState, useTransition } from "react";
import { moveLocationStateAction } from "../actions";

/** A move the location's state allows, with what stands in its way. */
export type StateMove = {
  to: LocationState;
  /** What to do first, as sentences; empty when the move can be made. */
  blockers: string[];
};

/** What the button of each move says, by the state it leads to and from. */
function labelOf(from: LocationState, to: LocationState) {
  switch (to) {
    case "preview":
      return "Move to preview";
    case "live":
      return from === "paused" ? "Resume" : "Go live";
    case "draft":
      return "Back to draft";
    case "paused":
      return "Pause";
  }
}

/** What the admin is asked before a move the public notices; null for the rest. */
function questionOf(to: LocationState, from: LocationState, name: string) {
  if (to === "live" && from === "preview") {
    return `Take ${name} live? Its pages become public and its slug is locked from then.`;
  }
  if (to === "paused") {
    return `Pause ${name}? Its pages stay public and show a notice in place of the search card.`;
  }
  return null;
}

/**
 * The moves a location can make from its state, each a button. A move that
 * its pages do not allow yet is disabled, with what to do first underneath.
 */
export function StateControls({
  locationId,
  name,
  state,
  moves,
}: {
  locationId: string;
  name: string;
  state: LocationState;
  moves: StateMove[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(to: LocationState) {
    const question = questionOf(to, state, name);
    if (question && !confirm(question)) return;
    startTransition(async () => {
      const result = await moveLocationStateAction(locationId, to);
      setError(result?.error ?? null);
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {moves.map(({ to, blockers }, index) => (
          <Button
            key={to}
            size="sm"
            variant={index === 0 ? "primary" : "secondary"}
            disabled={pending || blockers.length > 0}
            onClick={() => move(to)}
          >
            {labelOf(state, to)}
          </Button>
        ))}
      </div>
      {moves.map(({ to, blockers }) =>
        blockers.length > 0 ? (
          <div key={to} className="text-xs text-neutral-600">
            <p className="font-medium text-neutral-800">
              Before “{labelOf(state, to)}”:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
