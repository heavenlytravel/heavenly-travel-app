"use client";

import { TOP_CHOICE_CAP, type TopChoiceChange } from "@repo/db";
import type { TopChoice } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { useState, useTransition } from "react";
import { changeTopChoiceAction } from "../actions";

/**
 * The home page's top choices in their order, with this location's place
 * among them: add it at the end, move it up or down, or take it off. Only a
 * live location can be added; a paused one keeps its place and is left off
 * the home page until it is live again.
 */
export function TopChoiceControl({
  locationId,
  isLive,
  choices,
}: {
  locationId: string;
  isLive: boolean;
  /** Every top choice, in order, this location included when it is one. */
  choices: TopChoice[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const index = choices.findIndex((choice) => choice.id === locationId);
  const full = choices.length >= TOP_CHOICE_CAP;

  function change(what: TopChoiceChange) {
    startTransition(async () => {
      const result = await changeTopChoiceAction(locationId, what);
      setError(result?.error ?? null);
    });
  }

  return (
    <div className="grid gap-3">
      {choices.length === 0 ? (
        <p className="text-sm text-neutral-500">No top choices yet.</p>
      ) : (
        <ol className="grid gap-1 text-sm">
          {choices.map((choice, place) => (
            <li
              key={choice.id}
              className={cx(
                "flex items-baseline gap-2",
                choice.id === locationId
                  ? "font-medium text-neutral-900"
                  : "text-neutral-600",
              )}
            >
              <span className="w-4 shrink-0 text-xs text-neutral-500 tabular-nums">
                {place + 1}
              </span>
              <span>
                {choice.name}
                {choice.state === "paused" ? (
                  <span className="font-normal text-neutral-500">
                    {" "}
                    · paused, left off the home page
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}

      {index >= 0 ? (
        <div className="flex flex-wrap gap-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || index === 0}
            onClick={() => change("up")}
          >
            Up
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending || index === choices.length - 1}
            onClick={() => change("down")}
          >
            Down
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() => change("remove")}
          >
            Remove
          </Button>
        </div>
      ) : (
        <div className="grid gap-1.5">
          <div>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending || !isLive || full}
              onClick={() => change("add")}
            >
              Add to the top choices
            </Button>
          </div>
          {!isLive ? (
            <p className="text-xs text-neutral-500">
              Only a live location can be a top choice.
            </p>
          ) : full ? (
            <p className="text-xs text-neutral-500">
              The home page shows at most {TOP_CHOICE_CAP}. Remove one first.
            </p>
          ) : null}
        </div>
      )}
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
