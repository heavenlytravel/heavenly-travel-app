"use client";

import { TOP_CHOICE_CAP, type TopChoiceChange } from "@repo/db";
import type { TopChoice, TopChoiceCandidate } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Tooltip } from "@repo/ui/tooltip";
import { toast } from "@repo/ui/toast";
import { Button } from "@repo/ui/button";
import { Select } from "@repo/ui/select";
import { ArrowLeftIcon, ArrowRightIcon } from "@repo/ui/icons";
import Link from "next/link";
import { useState, useTransition } from "react";
import { TILE_LINK, Tile, TileFoot, TileGrid } from "../../_components/Card";
import { LocationStateBadge } from "../../_components/StatusBadges";
import { locationHref } from "../../_lib/routes";
import { CardImage } from "../../_components/CardImage";
import { changeTopChoiceAction } from "./actions";

/**
 * The home page's top choices as the cards they become there, in their
 * slots and in order: each with the location's main page hero image, its
 * place and its state, to move earlier or later or take off. The first
 * empty slot adds one of the live locations not yet chosen. Only a live
 * location can be added; a paused one keeps its place and is left off the
 * home page until it is live again.
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
    const name =
      choices.find((choice) => choice.id === locationId)?.name ??
      candidates.find((candidate) => candidate.id === locationId)?.name ??
      "The location";
    startTransition(async () => {
      const result = await changeTopChoiceAction(locationId, what);
      setError(result?.error ?? null);
      if (!result?.error) {
        toast.success(
          what === "add"
            ? `${name} is on the home page.`
            : what === "remove"
              ? `${name} is off the home page.`
              : `Moved ${name} ${what === "up" ? "earlier" : "later"}.`,
        );
      }
    });
  }

  return (
    <div className="grid gap-4">
      <TileGrid min="thirds">
        {slots.map((choice, place) =>
          choice ? (
            <Tile key={choice.id}>
              <CardImage
                src={choice.heroImage?.url ?? null}
                sizes="(min-width: 1024px) 18rem, (min-width: 640px) 50vw, 100vw"
                fallback={
                  <span className="text-5xl font-semibold text-neutral-300">
                    {choice.name.charAt(0).toUpperCase()}
                  </span>
                }
              >
                <Badge>{place + 1}</Badge>
                <LocationStateBadge state={choice.state} />
              </CardImage>
              <div className="min-w-0 px-4 pt-3 pb-4">
                <h3 className="truncate text-base font-semibold tracking-tight">
                  <Link href={locationHref(choice.slug)} className={TILE_LINK}>
                    {choice.name}
                  </Link>
                </h3>
                <p className="text-xs text-neutral-500">
                  {choice.state === "paused"
                    ? "Left off the home page while paused"
                    : `/${choice.slug}`}
                </p>
              </div>
              <TileFoot>
                <Tooltip content="Move earlier">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending || place === 0}
                    aria-label={`Move ${choice.name} earlier`}
                    className="w-8 px-0"
                    onClick={() => change(choice.id, "up")}
                  >
                    <ArrowLeftIcon />
                  </Button>
                </Tooltip>
                <Tooltip content="Move later">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending || place === choices.length - 1}
                    aria-label={`Move ${choice.name} later`}
                    className="w-8 px-0"
                    onClick={() => change(choice.id, "down")}
                  >
                    <ArrowRightIcon />
                  </Button>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  aria-label={`Remove ${choice.name}`}
                  className="ml-auto text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => change(choice.id, "remove")}
                >
                  Remove
                </Button>
              </TileFoot>
            </Tile>
          ) : (
            <li key={`empty-${place}`} className="min-w-0">
              <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-300 p-4 text-center">
                <span className="text-sm text-neutral-500">
                  Slot {place + 1} is empty
                </span>
                {place === choices.length && candidates.length > 0 ? (
                  <div className="flex w-full max-w-60 flex-col gap-2">
                    <Select
                      aria-label="Location to add"
                      value={toAdd}
                      disabled={pending}
                      onValueChange={setPicked}
                      options={candidates.map((candidate) => ({
                        value: candidate.id,
                        label: candidate.name,
                      }))}
                    />
                    <Button
                      variant="secondary"
                      disabled={pending || toAdd === ""}
                      onClick={() => change(toAdd, "add")}
                    >
                      Add to the home page
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ),
        )}
      </TileGrid>

      <p className="text-xs text-neutral-500">
        {full
          ? `The home page shows at most ${TOP_CHOICE_CAP}. Remove one to add another.`
          : candidates.length === 0
            ? "Every live location is a top choice already. Only a live location can be added."
            : "A location is added in the first empty slot. Only a live location can be added."}
      </p>
      {error ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
