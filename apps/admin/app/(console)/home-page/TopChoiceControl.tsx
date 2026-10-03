"use client";

import { TOP_CHOICE_CAP, type TopChoiceChange } from "@repo/db";
import type { TopChoice, TopChoiceCandidate } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Select } from "@repo/ui/field";
import Link from "next/link";
import { useState, useTransition } from "react";
import { LocationStateBadge } from "../../_components/StatusBadges";
import { locationHref } from "../../_lib/routes";
import { changeTopChoiceAction } from "./actions";

/**
 * The home page's top choices: its slots in order, each with the location
 * it holds, to move up or down or take off, and the live locations not yet
 * chosen, to add at the end. Only a live location can be added; a paused
 * one keeps its place and is left off the home page until it is live again.
 */
export function TopChoiceControl({
  choices,
  candidates,
}: {
  /** Every top choice, in order. */
  choices: TopChoice[];
  /** The live locations that are not top choices, by name. */
  candidates: TopChoiceCandidate[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState("");
  const full = choices.length >= TOP_CHOICE_CAP;
  // The one to add: what was picked, while it can still be added.
  const toAdd = candidates.some((candidate) => candidate.id === picked)
    ? picked
    : (candidates[0]?.id ?? "");
  const slots = Array.from(
    { length: Math.max(TOP_CHOICE_CAP, choices.length) },
    (_, place) => choices[place] ?? null,
  );

  function change(locationId: string, what: TopChoiceChange) {
    startTransition(async () => {
      const result = await changeTopChoiceAction(locationId, what);
      setError(result?.error ?? null);
    });
  }

  return (
    <div className="grid gap-4">
      <ol className="divide-y divide-neutral-100">
        {slots.map((choice, place) => (
          <li
            key={choice?.id ?? `empty-${place}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
          >
            <span className="w-4 shrink-0 text-sm text-neutral-500 tabular-nums">
              {place + 1}
            </span>
            {choice ? (
              <>
                <div className="min-w-40 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      href={locationHref(choice.id)}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {choice.name}
                    </Link>
                    <LocationStateBadge state={choice.state} />
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {choice.tagline ?? "No tagline"}
                    {choice.state === "paused"
                      ? " · Left off the home page while paused"
                      : null}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending || place === 0}
                    aria-label={`Move ${choice.name} up`}
                    onClick={() => change(choice.id, "up")}
                  >
                    Up
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending || place === choices.length - 1}
                    aria-label={`Move ${choice.name} down`}
                    onClick={() => change(choice.id, "down")}
                  >
                    Down
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    aria-label={`Remove ${choice.name}`}
                    onClick={() => change(choice.id, "remove")}
                  >
                    Remove
                  </Button>
                </div>
              </>
            ) : (
              <span className="text-sm text-neutral-500">Empty</span>
            )}
          </li>
        ))}
      </ol>

      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Location to add"
            className="max-w-64"
            value={toAdd}
            disabled={pending || full || candidates.length === 0}
            onChange={(event) => setPicked(event.target.value)}
          >
            {candidates.length === 0 ? (
              <option value="">No location to add</option>
            ) : (
              candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))
            )}
          </Select>
          <Button
            variant="secondary"
            disabled={pending || full || toAdd === ""}
            onClick={() => change(toAdd, "add")}
          >
            Add
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          {full
            ? `The home page shows at most ${TOP_CHOICE_CAP}. Remove one first.`
            : candidates.length === 0
              ? "Every live location is a top choice already. Only a live location can be added."
              : "Added in the last place. Only a live location can be added."}
        </p>
      </div>
      {error ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
