"use client";

import { useId, useState } from "react";
import { BOOKING_RULES } from "@repo/db";
import {
  EMPTY_SEARCH,
  withValue,
  type FieldKey,
  type SearchValues,
} from "../../_lib/search";
import {
  byStart,
  clashedByMessage,
  clashesOf,
  clashMessage,
  draftOf,
  isBlankDraft,
  newTripId,
  tripOfDraft,
  type PlannedTrip,
} from "../../_lib/trip-plan";
import type { TripSearchIssue } from "../../_lib/transportation-booking";

/** What a save did to the list, for the toast that says so. */
export type PlannerChange = "added" | "changed" | "removed";

/** The form: a new trip, or the trip of the list being changed. */
type Form = {
  values: SearchValues;
  /** The trip being changed; null for a new one. */
  editing: string | null;
  /** Changes when another trip opens, so the fields start afresh. */
  key: string;
};

const blankForm = (values: Partial<SearchValues> = {}): Form => ({
  values: { ...EMPTY_SEARCH, ...values, placeIds: { ...values.placeIds } },
  editing: null,
  key: newTripId(),
});

const tooMany: TripSearchIssue = {
  field: "from",
  message: `A booking takes up to ${BOOKING_RULES.maxTripsPerBooking} trips. Book the rest on their own.`,
};

/**
 * The trip planner's state: the list of trips by start, and the form that
 * adds a trip to it or changes one. The search card and the vehicle page
 * share it, so a trip is typed and changed the same way in both. "Add trip"
 * puts the form's trip in the list when it is complete and starts on time;
 * choosing a trip of the list opens it in the form, and a new trip half
 * typed waits until the change is done. `keepOpen` keeps the form open for
 * the next trip, as on the search card; the vehicle page closes it. The
 * list itself is the caller's, changed through `onTrips`.
 */
export function usePlanner({
  trips,
  onTrips,
  keepOpen,
}: {
  trips: readonly PlannedTrip[];
  onTrips: (next: PlannedTrip[], change: PlannerChange) => void;
  keepOpen: boolean;
}) {
  const scope = useId();
  const [form, setForm] = useState<Form | null>(() =>
    keepOpen ? blankForm() : null,
  );
  // A new trip being typed waits here while a trip of the list is changed.
  const [aside, setAside] = useState<SearchValues | null>(null);
  const [issues, setIssues] = useState<TripSearchIssue[]>([]);

  const sorted = byStart(trips);
  const editing = form?.editing ?? null;
  const others = editing ? sorted.filter((t) => t.id !== editing) : sorted;
  const numberOf = (id: string) => sorted.findIndex((t) => t.id === id) + 1;

  // The form's trip, when its day and time are set, against the others.
  const typed = form ? tripOfDraft(form.values, editing ?? "form") : null;
  const clashNotes: string[] = [];
  if (form && form.values.date && form.values.time) {
    const hourly = form.values.mode === "hourly";
    // Only the time counts here: the trip may still miss a place.
    const draft: PlannedTrip =
      typed?.ok === true
        ? typed.trip
        : {
            id: editing ?? "form",
            mode: hourly ? "hourly" : "oneway",
            pickup: { placeId: "", label: form.values.from },
            dropoff: null,
            date: form.values.date,
            time: form.values.time,
            hours: hourly ? Number(form.values.hours) || null : null,
          };
    const together = byStart([...others, draft]);
    for (const [id, clash] of clashesOf(together)) {
      if (id === draft.id) {
        clashNotes.push(
          clashMessage(
            clash.with,
            together.findIndex((t) => t.id === clash.with.id) + 1,
          ),
        );
      } else if (clash.with.id === draft.id) {
        const other = together.find((t) => t.id === id)!;
        clashNotes.push(
          clashedByMessage(together.findIndex((t) => t.id === id) + 1, other),
        );
      }
    }
  }

  /** Changes one value of the form's trip; its message goes once it is touched. */
  function set(key: FieldKey, value: string, placeId?: string) {
    setForm(
      (f) => f && { ...f, values: withValue(f.values, key, value, placeId) },
    );
    setIssues((found) => found.filter((issue) => issue.field !== key));
  }

  /** Opens a new trip in the form, filled in with what is known. */
  function openNew(values: Partial<SearchValues> = {}) {
    setAside(null);
    setIssues([]);
    setForm(blankForm(values));
  }

  /** Opens a trip of the list in the form, keeping a new trip half typed. */
  function open(id: string) {
    const trip = sorted.find((t) => t.id === id);
    if (!trip) return;
    if (form && !form.editing && !isBlankDraft(form.values)) {
      setAside(form.values);
    }
    setIssues([]);
    setForm({ values: draftOf(trip), editing: id, key: newTripId() });
  }

  function close() {
    setIssues([]);
    setForm(
      aside
        ? { values: aside, editing: null, key: newTripId() }
        : keepOpen
          ? blankForm()
          : null,
    );
    setAside(null);
  }

  /** Adds the new trip, or saves the changed one, when it is complete: the list with it, or null. */
  function commit(): PlannedTrip[] | null {
    if (!form) return [...sorted];
    if (!form.editing && sorted.length >= BOOKING_RULES.maxTripsPerBooking) {
      setIssues([tooMany]);
      return null;
    }
    const result = tripOfDraft(form.values, form.editing ?? newTripId());
    if (!result.ok) {
      setIssues(result.issues);
      return null;
    }
    if (clashNotes.length > 0) return null;
    const next = byStart([...others, result.trip]);
    onTrips(next, form.editing ? "changed" : "added");
    close();
    return next;
  }

  function remove() {
    if (!editing) return;
    onTrips(others, "removed");
    close();
  }

  /**
   * The trips to price: the list, with the form's trip when one is typed
   * or the list is empty; null, the reason shown, when that trip is not
   * complete or a trip of the list starts during another.
   */
  function collect(): PlannedTrip[] | null {
    let next: PlannedTrip[] = [...sorted];
    if (
      form &&
      (form.editing || !isBlankDraft(form.values) || next.length === 0)
    ) {
      const committed = commit();
      if (!committed) return null;
      next = committed;
    }
    const clashes = clashesOf(next);
    const wrong = next.find((t) => clashes.has(t.id));
    if (wrong) {
      // Open it, so the form says what to do.
      setAside(null);
      setIssues([]);
      setForm({ values: draftOf(wrong), editing: wrong.id, key: newTripId() });
      return null;
    }
    return next;
  }

  /** Fills values into the form's trip, opening a new one when it is closed. */
  function fill(values: Partial<SearchValues>) {
    setIssues([]);
    setForm((f) =>
      f
        ? {
            ...f,
            values: {
              ...f.values,
              ...values,
              placeIds: { ...f.values.placeIds, ...values.placeIds },
            },
          }
        : blankForm(values),
    );
  }

  /** How many trips getting prices sends. */
  const count =
    others.length + (editing || (form && !isBlankDraft(form.values)) ? 1 : 0);

  return {
    scope,
    trips: sorted,
    numberOf,
    form,
    editing,
    issues,
    clashNotes,
    keepOpen,
    count,
    set,
    fill,
    openNew,
    open,
    close,
    commit,
    remove,
    collect,
  };
}

export type Planner = ReturnType<typeof usePlanner>;
