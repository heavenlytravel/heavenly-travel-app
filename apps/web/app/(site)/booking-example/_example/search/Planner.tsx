"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  MapIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@repo/ui/icons";
import { toast } from "@repo/ui/toast";
import { focus, panel, secondaryButton } from "../../../_components/Page";
import { dayLabel, shortDay, todayInMalaysia, type TripMode } from "../data";
import {
  blankRow,
  clashMessage,
  rowsOf,
  tripsFromSearch,
  update,
  useExample,
  type SearchRow,
} from "../store";
import { routeLine } from "../ui";
import {
  AddButton,
  HoursBox,
  KINDS,
  PlaceBox,
  Problems,
  TripChoice,
  TripListBox,
  TripNumber,
  WhenBox,
  whenLine,
} from "./parts";
import { check, clashesIn, hasIssue, problemsIn, type Issues } from "./rules";

/**
 * The trip planner: the list of trips by date, and the form that adds a
 * trip to it or changes one. The search card and the vehicle page share
 * it, so a trip is typed and changed the same way in both; the confirm
 * page shows the list alone. A trip is one-way or hourly: a return is two
 * one-way trips, and a hire over several days one hourly trip a day.
 */

/** The form: a new trip, or the trip of the list being changed; closed when null. */
type PlannerForm = { row: SearchRow; editing: string | null } | null;

const isBlank = (row: SearchRow) =>
  !row.from && !row.to && !row.date && !row.time;

const byStart = (rows: SearchRow[]) =>
  [...rows].sort((a, b) =>
    `${a.date || "~"}T${a.time}`.localeCompare(`${b.date || "~"}T${b.time}`),
  );

/** Where the search card starts: one trip fills the form; more go in the list, with the one asked for open. */
export function startOf(seed: SearchRow[], open: string | null) {
  if (seed.length === 1) {
    const form: PlannerForm = { row: seed[0]!, editing: null };
    return { rows: [] as SearchRow[], form };
  }
  const asked = open ? seed.find((r) => r.id === open) : undefined;
  const form: PlannerForm = asked
    ? { row: asked, editing: asked.id }
    : { row: blankRow(), editing: null };
  return { rows: seed, form };
}

export type Change = "added" | "changed" | "removed";

export function usePlanner({
  rows,
  onRows,
  initial,
  keepOpen,
}: {
  rows: SearchRow[];
  onRows: (rows: SearchRow[], change: Change) => void;
  initial: PlannerForm;
  /** The form stays open for the next trip, as on the search card. */
  keepOpen: boolean;
}) {
  const scope = useId();
  const [form, setForm] = useState<PlannerForm>(initial);
  // A new trip being typed waits here while a trip of the list is changed.
  const [aside, setAside] = useState<SearchRow | null>(null);
  const [issues, setIssues] = useState<Issues>({});

  const editing = form?.editing ?? null;
  const row = form?.row ?? null;
  const others = editing ? rows.filter((r) => r.id !== editing) : rows;
  const numberOf = (id: string) =>
    byStart(rows).findIndex((r) => r.id === id) + 1;

  // The form's trip against the others: one vehicle does one trip at a time.
  const clashNotes: string[] = [];
  if (row) {
    for (const [id, earlier] of clashesIn([...others, row])) {
      if (id === row.id) {
        clashNotes.push(clashMessage(earlier));
      } else if (earlier.id === row.id) {
        clashNotes.push(
          `Trip ${numberOf(id)}, ${whenLine(others.find((r) => r.id === id)!)}, starts while this one is still going, and one vehicle cannot do both. Change the time of one of them.`,
        );
      }
    }
  }

  function setRow(change: Partial<SearchRow>, field: string) {
    if (!row) return;
    setForm((f) => f && { ...f, row: { ...f.row, ...change } });
    const key = `${row.id}.${field}`;
    setIssues((found) => {
      if (!found[key]) return found;
      const rest = { ...found };
      delete rest[key];
      return rest;
    });
  }

  /** Opens a new trip in the form, filled in with what is known. */
  function openNew(start?: Partial<SearchRow>) {
    setAside(null);
    setIssues({});
    setForm({ row: blankRow(start), editing: null });
  }

  /** Opens a trip of the list in the form. */
  function open(id: string) {
    if (form && !form.editing && !isBlank(form.row)) setAside(form.row);
    setIssues({});
    setForm({ row: rows.find((r) => r.id === id)!, editing: id });
  }

  function close() {
    setIssues({});
    setForm(
      aside
        ? { row: aside, editing: null }
        : keepOpen
          ? { row: blankRow(), editing: null }
          : null,
    );
    setAside(null);
  }

  /** Adds the new trip, or saves the changed one, when it is complete: the list with it, or null. */
  function commit(): SearchRow[] | null {
    if (!form) return rows;
    const found = check([form.row]);
    setIssues(found);
    if (Object.keys(found).length > 0 || clashNotes.length > 0) return null;
    // An hourly trip keeps no drop-off.
    const saved = {
      ...form.row,
      to: form.row.mode === "hourly" ? "" : form.row.to,
    };
    const next = [...others, saved];
    onRows(next, form.editing ? "changed" : "added");
    close();
    return next;
  }

  function remove() {
    if (!editing) return;
    onRows(others, "removed");
    close();
  }

  /** The trips to price: the list, with the form's trip when one is typed; null, saying why, when one is not complete. */
  function collect(): SearchRow[] | null {
    let next = rows;
    if (form && (form.editing || !isBlank(form.row) || rows.length === 0)) {
      const committed = commit();
      if (!committed) return null;
      next = committed;
    }
    const found = problemsIn(next);
    if (found.wrong) {
      setForm({ row: found.wrong, editing: found.wrong.id });
      setIssues(found.issues);
      return null;
    }
    return next;
  }

  /** How many trips getting prices sends. */
  const count = others.length + (editing || (row && !isBlank(row)) ? 1 : 0);

  return {
    scope,
    rows,
    numberOf,
    form,
    row,
    editing,
    issues,
    clashNotes,
    keepOpen,
    count,
    setRow,
    openNew,
    open,
    close,
    commit,
    remove,
    collect,
  };
}

export type Planner = ReturnType<typeof usePlanner>;

/** The planner for a booking's own trips, on the vehicle page: each change is saved to them at once. */
export function useBookingPlanner() {
  const { trips } = useExample();
  return usePlanner({
    rows: rowsOf(trips),
    initial: null,
    keepOpen: false,
    onRows: (next, change) => {
      const before = trips;
      update((s) => ({ ...s, trips: tripsFromSearch(next, s.trips) }));
      if (change === "removed") {
        toast.success("Trip removed", {
          action: {
            label: "Undo",
            onClick: () => update((s) => ({ ...s, trips: before })),
          },
        });
      } else {
        toast.success(change === "added" ? "Trip added" : "Trip updated");
      }
    },
  });
}

/* ---------- the list ---------- */

/** A line under a trip in the list: why it cannot be booked, or what to know about it. */
export type TripNote = { tone: "red" | "amber" | "blue"; text: string };

const NOTE_TONES: Record<TripNote["tone"], string> = {
  red: "text-[#b3261e]",
  amber: "text-[#7a5a00]",
  blue: "text-navy",
};

/**
 * The trips by date, numbered as they are booked and priced, each with its
 * price and what it needs to say on the pages that know them. With
 * `onPick` a trip opens in the form; without, the list only shows them.
 */
export function TripTimeline({
  rows,
  open = null,
  issues = {},
  onPick,
  priceOf,
  noteOf,
  action,
  className,
}: {
  rows: SearchRow[];
  /** The trip open in the form. */
  open?: string | null;
  issues?: Issues;
  onPick?: (id: string) => void;
  priceOf?: (row: SearchRow) => ReactNode;
  noteOf?: (row: SearchRow) => TripNote | null;
  /** Beside the list's title, such as a link to change the trips. */
  action?: ReactNode;
  className?: string;
}) {
  const sorted = byStart(rows);
  const clashes = clashesIn(sorted);

  return (
    <TripListBox
      hint={onPick ? "Choose one to change it" : undefined}
      action={action}
      className={className}
    >
      <ol className="grid gap-1.5">
        {sorted.map((row, index) => {
          const isOpen = row.id === open;
          const clash = clashes.get(row.id);
          const problem = isOpen
            ? null
            : clash
              ? clash.mode === "hourly"
                ? "Starts during another trip"
                : "Same time as another trip"
              : hasIssue(issues, row)
                ? "Not finished"
                : null;
          const note = isOpen ? null : (noteOf?.(row) ?? null);
          const red = problem !== null || note?.tone === "red";
          const look = `flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-[0.88rem] leading-snug ${
            isOpen
              ? "border-brand bg-brand-tint"
              : red
                ? "border-[#b3261e] bg-white"
                : "border-slate-200 bg-white"
          }`;
          const body = (
            <>
              <TripNumber value={index + 1} small />
              <span className="grid min-w-0 flex-1 gap-x-4 @xl:grid-cols-[140px_minmax(0,1fr)] @xl:items-center">
                <b className="text-ink">{whenLine(row)}</b>
                <span
                  className={`min-w-0 @xl:truncate ${
                    problem ? "text-[#b3261e]" : "text-slate-600"
                  }`}
                >
                  {problem ?? routeLine(row)}
                </span>
                {note ? (
                  <span
                    className={`col-span-full mt-1 text-[0.85rem] ${NOTE_TONES[note.tone]}`}
                  >
                    {note.text}
                  </span>
                ) : null}
              </span>
              {priceOf ? (
                <span className="shrink-0 font-semibold text-ink">
                  {priceOf(row)}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={row.id}>
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(row.id)}
                  aria-current={isOpen ? "true" : undefined}
                  className={`${look} ${isOpen || red ? "" : "hover:border-brand/50"} ${focus}`}
                >
                  {body}
                  {isOpen ? null : (
                    <PencilIcon className="size-3.5 shrink-0 text-slate-400" />
                  )}
                </button>
              ) : (
                <div className={look}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </TripListBox>
  );
}

/* ---------- the form ---------- */

const textButton = `inline-flex min-h-[48px] items-center gap-1.5 px-1 text-[0.95rem] font-semibold hover:underline ${focus}`;

/**
 * The trip form: kind, places and when in one row, as the home page card
 * asks a trip. A new trip is added to the list with "Add trip", and the
 * form empties for the next; a trip of the list is saved, or removed.
 * `children` follow the form's own buttons, such as the search card's.
 */
export function TripForm({
  planner,
  children,
}: {
  planner: Planner;
  children?: ReactNode;
}) {
  const { scope, rows, row, editing, issues, clashNotes, keepOpen, numberOf } =
    planner;
  if (!row) return null;
  const today = todayInMalaysia();
  const id = (field: string) => `${scope}-${row.id}-${field}`;
  const messages = [
    ...new Set([
      ...["from", "to", "when"]
        .map((field) => issues[`${row.id}.${field}`])
        .filter((m): m is string => Boolean(m)),
      ...clashNotes,
    ]),
  ];

  return (
    <div className="@container">
      {rows.length > 0 ? (
        <div className="mx-1 mb-3 flex items-center gap-2.5">
          {editing ? (
            <TripNumber value={numberOf(editing)} />
          ) : (
            <span className="grid size-6 place-items-center rounded-full bg-brand-tint text-brand">
              <PlusIcon className="size-4" />
            </span>
          )}
          <p className="font-bold text-ink">
            {editing ? `Change trip ${numberOf(editing)}` : "Add a trip"}
          </p>
        </div>
      ) : null}

      <div
        key={row.id}
        className="grid gap-2.5 @lg:grid-cols-2 @3xl:flex @3xl:gap-0"
      >
        <TripChoice
          name={id("kind")}
          value={row.mode}
          options={Object.values(KINDS)}
          onChange={(mode) =>
            planner.setRow({ mode: mode as TripMode }, "mode")
          }
        />
        <PlaceBox
          id={id("from")}
          field="from"
          value={row.from}
          invalid={Boolean(issues[`${row.id}.from`])}
          onChange={(from) => planner.setRow({ from }, "from")}
        />
        {row.mode === "hourly" ? (
          <HoursBox
            id={id("hours")}
            value={row.hours}
            onChange={(hours) => planner.setRow({ hours }, "hours")}
          />
        ) : (
          <PlaceBox
            id={id("to")}
            field="to"
            value={row.to}
            invalid={Boolean(issues[`${row.id}.to`])}
            onChange={(to) => planner.setRow({ to }, "to")}
          />
        )}
        <WhenBox
          id={id("when")}
          place="last"
          date={row.date}
          time={row.time}
          min={today}
          invalid={Boolean(issues[`${row.id}.when`]) || clashNotes.length > 0}
          onChange={(date, time) => planner.setRow({ date, time }, "when")}
        />
      </div>
      <Problems messages={messages} />

      <div className="mx-1 mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        {editing ? (
          <>
            <button
              type="button"
              onClick={planner.commit}
              className={secondaryButton}
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={planner.close}
              className={`${textButton} text-slate-600`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={planner.remove}
              className={`${textButton} text-[#b3261e]`}
            >
              <TrashIcon className="size-4" />
              Remove trip
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={planner.commit}
              className={`${secondaryButton} gap-2`}
            >
              <PlusIcon className="size-4" />
              Add trip
            </button>
            {keepOpen ? null : (
              <button
                type="button"
                onClick={planner.close}
                className={`${textButton} text-slate-600`}
              >
                Cancel
              </button>
            )}
          </>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * The booking's trips on the vehicle page: the list, and the form when a
 * trip is open. Once the list scrolls away, a thin bar keeps the trips at
 * the top of the screen, under the site header; choosing it opens the list
 * in a sheet below it, where a trip is changed or added without leaving
 * the place the customer has scrolled to.
 */
export function TripsPanel({
  planner,
  priceOf,
  summary,
}: {
  planner: Planner;
  priceOf?: (row: SearchRow) => ReactNode;
  /** The bar's last word, such as the vehicle and the total. */
  summary?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [away, setAway] = useState(false);
  const [sheet, setSheet] = useState(false);
  // Clipped while it opens and closes; free once open, so a place's
  // suggestions can hang below it.
  const [settled, setSettled] = useState(false);
  const sorted = byStart(planner.rows);

  function showSheet(open: boolean) {
    setSheet(open);
    setSettled(
      open && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }
  const first = sorted[0];
  const last = sorted.at(-1);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    // Away once its foot has gone under the site header.
    const watch = new IntersectionObserver(
      ([entry]) => {
        const gone =
          !entry!.isIntersecting && entry!.boundingClientRect.top < 0;
        setAway(gone);
        if (!gone) {
          setSheet(false);
          setSettled(false);
        }
      },
      { rootMargin: "-77px 0px 0px 0px" },
    );
    watch.observe(section);
    return () => watch.disconnect();
  }, []);

  const list = (
    <TripTimeline
      rows={planner.rows}
      open={planner.editing}
      issues={planner.issues}
      onPick={planner.open}
      priceOf={priceOf}
    />
  );
  // The form is in one place at a time: the sheet while it is open.
  const form = planner.form ? (
    <TripForm planner={planner} />
  ) : (
    <AddButton icon={PlusIcon} onClick={() => planner.openNew()}>
      Add a trip
    </AddButton>
  );

  return (
    <>
      <section ref={ref} className={`${panel} mb-6 scroll-mt-28`}>
        {list}
        {sheet ? null : form}
      </section>

      <div
        inert={!away}
        onKeyDown={(e) => {
          if (e.key === "Escape") showSheet(false);
        }}
        className={`fixed inset-x-0 top-[69px] z-20 transition duration-300 ease-out motion-reduce:transition-none sm:top-[77px] ${
          away
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="rounded-b-[18px] border border-t-0 border-slate-200 bg-white shadow-[0_18px_40px_rgba(0,38,75,0.14)]">
            <button
              type="button"
              onClick={() => showSheet(!sheet)}
              aria-expanded={sheet}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.92rem] sm:px-5 ${focus}`}
            >
              <MapIcon className="size-[18px] shrink-0 text-brand" />
              <b className="shrink-0 text-ink">
                {sorted.length === 1 ? "1 trip" : `${sorted.length} trips`}
              </b>
              {first?.date && last?.date ? (
                <span className="min-w-0 truncate text-slate-600">
                  {first.date === last.date
                    ? dayLabel(first.date)
                    : `${shortDay(first.date)} to ${shortDay(last.date)}`}
                </span>
              ) : null}
              <span className="ml-auto flex shrink-0 items-center gap-3">
                {summary ? (
                  <span className="hidden font-semibold text-ink sm:inline">
                    {summary}
                  </span>
                ) : null}
                <span className="flex items-center gap-1 font-semibold text-brand">
                  {sheet ? "Hide" : "Show"}
                  <ChevronDownIcon
                    className={`size-4 transition-transform duration-300 ${
                      sheet ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </span>
            </button>
            <div
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && sheet) setSettled(true);
              }}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                sheet ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div
                inert={!sheet}
                className={`min-h-0 ${settled ? "overflow-visible" : "overflow-hidden"}`}
              >
                <div className="border-t border-slate-100 px-3 pt-3 pb-4 sm:px-4">
                  {/* Only the list scrolls, so the form below it stays in view. */}
                  <div className="max-h-[40dvh] overflow-y-auto">{list}</div>
                  {sheet ? form : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
