"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@repo/ui/select";
import { PageTitle, textLink } from "../../_components/Page";
import { CardFrame } from "./search/parts";
import { SearchCard } from "./search/SearchCard";
import { useSend } from "./search/useSend";
import { SITUATIONS, STEP_PATHS } from "./situations";
import {
  freshState,
  rowsOf,
  update,
  useExample,
  type ExampleState,
} from "./store";
import { noteLink, useHydrated } from "./ui";

/** What the example can fill the card with: a blank card, or a situation that starts on the search. */
const FILLS: { value: string; label: string; load: () => ExampleState }[] = [
  { value: "blank", label: "A blank card", load: freshState },
  ...SITUATIONS.flatMap((g) => g.items)
    .filter((s) => s.step === "search")
    .map((s) => ({ value: s.id, label: s.title, load: s.load })),
];

/**
 * Step 1, the home page's search card with the trip planner. The example
 * fills it with a situation chosen at the top. One vehicle does every trip;
 * it is chosen on the next step. Opened with the booking's trips, the card
 * changes them or adds to them.
 */
export function SearchStep() {
  const hydrated = useHydrated();
  const state = useExample();
  const router = useRouter();
  const { changing, priced, send, dialog } = useSend();
  // Each fill starts the card afresh from the example's search.
  const [round, setRound] = useState(0);
  const [fill, setFill] = useState("");
  if (!hydrated) return null;

  const { trips } = state;

  function refill(change: (s: ExampleState) => ExampleState) {
    update(change);
    setRound((r) => r + 1);
  }

  return (
    <>
      <PageTitle eyebrow="Home page" title="Plan your trip.">
        One trip, or as many as your stay needs. One vehicle does them all.
      </PageTitle>

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-dashed border-orange-400 bg-orange-50/70 px-4 py-3 text-orange-950">
        <label htmlFor="fill" className="text-[0.92rem] font-semibold">
          Fill the card with
        </label>
        <Select
          id="fill"
          value={fill}
          onValueChange={(value) => {
            const chosen = FILLS.find((f) => f.value === value);
            if (!chosen) return;
            setFill(value);
            refill(() => chosen.load());
          }}
          options={FILLS.map(({ value, label }) => ({ value, label }))}
          placeholder="Choose a situation"
          className="w-full bg-white sm:w-[300px]"
        />
      </div>

      {changing ? (
        <p className="mb-4 rounded-xl bg-brand-tint px-4 py-3 text-[0.95rem] text-navy">
          These are the trips of your booking. Change, add or remove any, then
          update.{" "}
          <button
            type="button"
            onClick={() => {
              update((s) => ({ ...s, editing: null }));
              router.push(priced ? STEP_PATHS.confirm : STEP_PATHS.vehicle);
            }}
            className={textLink}
          >
            Leave them as they were
          </button>
        </p>
      ) : trips.length > 0 ? (
        <p className="mb-4 rounded-xl bg-[#fff4d6] px-4 py-3 text-[0.95rem] text-[#6b4e00]">
          A new search starts a new booking, in place of the{" "}
          {trips.length === 1 ? "trip" : `${trips.length} trips`} you have.{" "}
          <button
            type="button"
            onClick={() =>
              refill((s) => ({ ...s, search: rowsOf(s.trips), editing: null }))
            }
            className={noteLink}
          >
            Change those instead
          </button>
        </p>
      ) : null}

      <CardFrame key={round}>
        <SearchCard
          seed={state.search}
          seedOpen={state.editing}
          priced={priced}
          onSend={send}
        />
      </CardFrame>
      {dialog}
    </>
  );
}
