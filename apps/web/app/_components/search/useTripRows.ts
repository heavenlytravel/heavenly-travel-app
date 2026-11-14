"use client";

import { useState } from "react";
import { BOOKING_RULES, byStart, clashesOf } from "@repo/db";
import {
  EMPTY_SEARCH,
  withValue,
  type FieldKey,
  type SearchValues,
} from "../../_lib/search";
import type { TripSearchIssue } from "../../_lib/transportation-booking";
import {
  clashedByMessage,
  clashMessage,
  draftOf,
  newTripId,
  timedDraft,
  tripOfDraft,
  type PlannedTrip,
} from "../../_lib/trip-plan";

/** A trip as the search card holds it: one row of the form, numbered by its place. */
export type TripRow = { id: string; values: SearchValues };

/**
 * The fields whose message goes when another field changes: the kind of
 * trip decides whether a drop-off and a duration are asked, and a hire's
 * tick whether its drop-off is.
 */
const ANSWERS: Partial<Record<FieldKey, readonly string[]>> = {
  mode: ["to", "duration"],
  elsewhere: ["to"],
};

const blank = (id: string, values: Partial<SearchValues> = {}): TripRow => ({
  id,
  values: { ...EMPTY_SEARCH, ...values, placeIds: { ...values.placeIds } },
});

/**
 * The search card's trips, every one open at once: a row of the form
 * each, typed in any order. "Add Another Trip" adds an empty row whatever
 * the others hold, and a row is removed on its own; nothing is saved
 * along the way. The trips are checked when they are sent (`collect`):
 * every row is a trip, so a row left empty says what it misses as one
 * half typed does, at its fields, until it is filled or removed; two trips that cannot share the vehicle say
 * so as soon as their times are set, with the planner's messages
 * (`trip-plan`). The rows are held by the `SearchProvider`, so on a
 * location's pages they stay while the customer moves between them.
 * `from` starts the rows with trips already planned, as the vehicle
 * page's; a row keeps its trip's id, so what the page says of a trip
 * shows at its row.
 */
export function useTripRows(from: readonly PlannedTrip[] = []) {
  // The first row is named alike on the server and in the browser.
  const [rows, setRows] = useState<TripRow[]>(() =>
    from.length > 0
      ? from.map((trip) => ({ id: trip.id, values: draftOf(trip) }))
      : [blank("t0")],
  );
  const [issues, setIssues] = useState<Record<string, TripSearchIssue[]>>({});

  const numberOf = (id: string) => rows.findIndex((r) => r.id === id) + 1;

  // Each row whose day and time are set, against the others.
  const timed = rows.flatMap((row) => timedDraft(row.values, row.id) ?? []);
  const notes: Record<string, string[]> = {};
  const note = (id: string, text: string) => (notes[id] ??= []).push(text);
  for (const [id, clash] of clashesOf(byStart(timed))) {
    note(id, clashMessage(clash.with, numberOf(clash.with.id)));
    note(
      clash.with.id,
      clashedByMessage(
        numberOf(id),
        timed.find((t) => t.id === id)!,
      ),
    );
  }

  return {
    rows,
    /** The trips that are complete, for what the bar under the header says of them. */
    complete: timed.filter((trip) => trip.pickup.placeId !== ""),
    /** No more rows: the booking is at its most. */
    full: rows.length >= BOOKING_RULES.maxTripsPerBooking,
    /** What a row's fields miss, found when the trips were last sent. */
    issuesOf: (id: string) => issues[id] ?? [],
    /** Why a row's trip cannot share the vehicle with another. */
    notesOf: (id: string) => notes[id] ?? [],

    /** Changes one value of a row; the messages it answers go. */
    set(id: string, key: FieldKey, value: string, placeId?: string) {
      setRows((was) =>
        was.map((row) =>
          row.id === id
            ? { ...row, values: withValue(row.values, key, value, placeId) }
            : row,
        ),
      );
      const answered = (field: string) =>
        field === key || (ANSWERS[key]?.includes(field) ?? false);
      setIssues((was) =>
        was[id]
          ? { ...was, [id]: was[id].filter((x) => !answered(x.field)) }
          : was,
      );
    },

    /**
     * Fills values into the last row, the trip being typed: a place's
     * "Take Me Here" fills its drop-off.
     */
    fill(values: Partial<SearchValues>) {
      setRows((was) =>
        was.map((row, i) =>
          i === was.length - 1
            ? {
                ...row,
                values: {
                  ...row.values,
                  ...values,
                  placeIds: { ...row.values.placeIds, ...values.placeIds },
                },
              }
            : row,
        ),
      );
      setIssues({});
    },

    /** Adds an empty row, whatever the others hold. */
    add() {
      const id = newTripId();
      setRows((was) =>
        was.length >= BOOKING_RULES.maxTripsPerBooking
          ? was
          : [...was, blank(id)],
      );
    },

    /** Removes a row; the only one left stays. */
    remove(id: string) {
      setRows((was) =>
        was.length > 1 ? was.filter((row) => row.id !== id) : was,
      );
      setIssues((was) => {
        const rest = { ...was };
        delete rest[id];
        return rest;
      });
    },

    /**
     * The trips to price, by start, one a row; null, the reasons shown at
     * the rows, when one is not complete or two cannot share the vehicle.
     */
    collect(): PlannedTrip[] | null {
      const found: Record<string, TripSearchIssue[]> = {};
      const trips: PlannedTrip[] = [];
      for (const row of rows) {
        const result = tripOfDraft(row.values, row.id);
        if (result.ok) trips.push(result.trip);
        else found[row.id] = result.issues;
      }
      setIssues(found);
      if (Object.keys(found).length > 0) return null;
      if (rows.some((row) => notes[row.id])) return null;
      return byStart(trips);
    },
  };
}

export type TripRows = ReturnType<typeof useTripRows>;
