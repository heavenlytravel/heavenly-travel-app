"use client";

import { useState } from "react";
import {
  formatLocalDateTime,
  type TripCategory,
  type TripView,
} from "@repo/db";
import { FieldInput } from "../../../../_components/search/fields";
import {
  PRODUCTS,
  visibleFields,
  type SearchValues,
} from "../../../../_lib/search";
import type {
  TripSearch,
  TripSearchIssue,
} from "../../../../_lib/transportation-booking";
import { useSearch, useTripSubmit } from "../../../../_lib/useSearch";
import {
  control,
  panel,
  primaryButton,
  secondaryButton,
} from "../../../_components/Page";

type Props = {
  category: TripCategory;
  /** The trip as the URL carries it: what the editor starts from. */
  search: TripSearch;
  /** The same trip resolved, for the names of the places. */
  trip: TripView;
  /** The passenger count typed so far, carried over a changed trip. */
  passengers?: number;
};

/**
 * The trip in one bar at the top of the options page, with an Edit button.
 * Editing shows the fields the home card shows for the category, built from
 * the same field definitions and inputs, filled in with the current trip.
 * Saving loads the options page again with the new trip in the URL, so the
 * server prices every class again. The category cannot be changed here.
 */
export function TripBar({ category, search, trip, passengers }: Props) {
  const [editing, setEditing] = useState(false);
  const { issues, pending, submit } = useTripSubmit();

  const facts: [label: string, value: string][] = [
    ["Pick-up", trip.pickup.label],
    trip.dropoff
      ? ["Drop-off", trip.dropoff.label]
      : ["Duration", `${trip.hours} hours`],
    ["Pick-up time", formatLocalDateTime(trip.startsAt)],
  ];

  return (
    <section className={`${panel} mb-8`} aria-label="Your trip">
      {editing ? (
        <TripEditor
          category={category}
          preset={presetOf(search, trip)}
          issues={issues}
          onCancel={() => setEditing(false)}
          onSave={(values) => {
            if (submit(category, values, passengers)) setEditing(false);
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <dl className="grid flex-1 gap-x-8 gap-y-3 sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[0.8rem] text-[#67726f]">{label}</dt>
                <dd className="font-semibold text-[#082f2b]">{value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
            className={secondaryButton}
          >
            {pending ? "Updating prices…" : "Edit"}
          </button>
        </div>
      )}
    </section>
  );
}

/** The current trip as the values the search fields hold. */
function presetOf(search: TripSearch, trip: TripView): Partial<SearchValues> {
  const preset: Partial<SearchValues> = {
    mode: search.mode,
    from: trip.pickup.label,
    to: trip.dropoff?.label ?? "",
    date: search.date,
    time: search.time,
    placeIds: {
      from: search.pickupId,
      to: search.dropoffId ?? undefined,
    },
  };
  if (search.hours !== null) preset.hours = String(search.hours);
  return preset;
}

function TripEditor({
  category,
  preset,
  issues,
  onSave,
  onCancel,
}: {
  category: TripCategory;
  preset: Partial<SearchValues>;
  issues: TripSearchIssue[];
  onSave: (values: SearchValues) => void;
  onCancel: () => void;
}) {
  const { values, set } = useSearch(category, preset);
  const fields = visibleFields(PRODUCTS[category], values);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSave(values);
      }}
    >
      <h2 className="mb-4 font-(family-name:--font-display) text-[1.5rem]">
        Change your trip
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => {
          const id = `trip-${f.key}`;
          const issue = issues.some((x) => x.field === f.key);
          return (
            <div key={f.key} className="min-w-0">
              <label
                htmlFor={id}
                className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]"
              >
                {f.label}
              </label>
              <FieldInput
                def={f}
                id={id}
                values={values}
                onChange={(v, placeId) => set(f.key, v, placeId)}
                className={`${control} ${issue ? "border-[#b3261e]" : ""}`}
              />
            </div>
          );
        })}
      </div>
      {issues.length > 0 && (
        <p role="alert" className="mt-3 text-[0.92rem] text-[#b3261e]">
          {issues.map((x) => x.message).join(" ")}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className={primaryButton}>
          Update prices
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
      <p className="mt-3 text-[0.85rem] text-[#67726f]">
        A changed trip is priced again, so you choose your vehicle after.
      </p>
    </form>
  );
}
