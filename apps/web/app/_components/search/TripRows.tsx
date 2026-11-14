"use client";

import type { ReactNode } from "react";
import type { BBox, TripCategory } from "@repo/db";
import { PlusIcon, TrashIcon, UsersIcon } from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";
import type { PlacePresets } from "@repo/ui/place-input";
import {
  fieldKeys,
  PRODUCTS,
  visibleFields,
  type FieldDef,
  type FieldKey,
} from "../../_lib/search";
import {
  clampPassengers,
  MAX_PASSENGERS,
  PassengersStepper,
} from "../trips/PassengersStepper";
import { TripNumber } from "../trips/TripNumber";
import { FieldBox, fieldBox, fieldLabel, fieldRing, KindBox } from "./fields";
import look from "./search-card.module.css";
import type { TripRows as Trips } from "./useTripRows";

/**
 * How much of a row a field takes, by what it asks: the places share
 * what is left; a day and time, and a hire's hours, are as wide as what
 * they show, so the places keep the room. Where the boxes stand one under
 * the other (below 64rem of card) each takes the full width.
 */
const WIDTH: Partial<Record<FieldDef["kind"], string>> = {
  place: "@5xl:flex-1",
  when: "@5xl:w-[200px] @5xl:flex-none",
  choice: "@5xl:w-[124px] @5xl:flex-none",
};

/**
 * What is typed, a size smaller once the boxes stand in one line, so
 * each gives it room. A phone keeps the full size, which also stops its
 * browser zooming in on a field.
 */
const beside = "@5xl:text-copy";

/**
 * A row and its send button: one line where the card has room for both,
 * the button under the row where it has not.
 */
const line = "flex flex-col gap-3 @7xl:flex-row";

/** The send button beside a row: as tall as the row in a wide card. */
const besideRow =
  "h-14 w-full px-6 @3xl:w-auto @3xl:min-w-[230px] @3xl:self-end @7xl:h-[72px] @7xl:w-[160px] @7xl:min-w-0 @7xl:self-start";

/** The send button at the foot, beside the group's size. */
const atFoot = "h-14 w-full px-7 @3xl:w-auto @3xl:min-w-[230px]";

/** "Add Another Trip" among the rows: where the boxes stand one under the other. */
const narrowOnly = "@5xl:hidden";

/**
 * The trips of a booking as the search card asks them: one row each,
 * every row open, its boxes joined in one white frame. With one trip it
 * is the row alone, the group's size its last box and the send button at
 * its end. With several,
 * each row is its trip only, numbered beside its kind, with a button that
 * removes it; the group's size, asked once for the booking, moves to the
 * foot beside the send button. What a row misses, or why its trip cannot
 * share the vehicle, shows under it; a group of none (`groupIssue`) shows
 * where the group is asked. Where the boxes stand one under the other,
 * `addTrip` comes after the last trip, before the group and the button;
 * wider, the caller puts it after the form. `scope` names the fields, so
 * the form can stand twice on a page: in the card, and in the sheet under
 * the header, where `rowsClassName` lets the rows scroll while the foot
 * stays put.
 */
export function TripRows({
  scope,
  trips,
  category,
  passengers,
  onPassengers,
  groupIssue,
  presetsOf,
  near,
  send,
  addTrip,
  alertsOf,
  rowsClassName = "",
}: {
  scope: string;
  trips: Trips;
  category: TripCategory;
  passengers: number;
  onPassengers: (passengers: number) => void;
  /** Why the group's size cannot be sent: none was given. */
  groupIssue?: string | null;
  /** What a place field offers when it is opened empty. */
  presetsOf?: (key: FieldKey) => PlacePresets | undefined;
  /** The box whose places the place fields suggest first. */
  near?: BBox;
  /** The send button, drawn with the classes of where it stands. */
  send: (className: string) => ReactNode;
  /** "Add Another Trip", for where the boxes stand one under the other. */
  addTrip: ReactNode;
  /** What the page says of a row's trip, such as why it cannot be priced. */
  alertsOf?: (id: string) => string[];
  /** Classes for the box that holds the rows. */
  rowsClassName?: string;
}) {
  const several = trips.rows.length > 1;
  const groupId = `${scope}-group-issue`;
  const passengersId = `${scope}-passengers`;
  return (
    <>
      <div className={`grid gap-2.5 ${rowsClassName}`}>
        {trips.rows.map((row, index) => {
          const id = (key: string) => `${scope}-${row.id}-${key}`;
          const issues = trips.issuesOf(row.id);
          const notes = trips.notesOf(row.id);
          const grouped = !several && groupIssue ? [groupIssue] : [];
          const messages = [
            ...new Set([
              ...issues.map((x) => x.message),
              ...notes,
              ...(alertsOf?.(row.id) ?? []),
              ...grouped,
            ]),
          ];
          const messagesId = id("issues");
          const refused = (f: FieldDef) =>
            issues.some((x) => fieldKeys(f).some((key) => key === x.field)) ||
            (f.kind === "when" && notes.length > 0);
          const onChange = (key: FieldKey, value: string, placeId?: string) =>
            trips.set(row.id, key, value, placeId);
          const last = index === trips.rows.length - 1;
          const fields = visibleFields(PRODUCTS[category], row.values);
          return (
            <div
              key={row.id}
              className={`${look.in} ${
                several
                  ? "relative @5xl:flex @5xl:items-start @5xl:gap-2.5"
                  : line
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className={`${look.row} min-w-0 flex-1`}>
                  {fields.map((f) =>
                    f.key === "mode" ? (
                      <KindBox
                        key={f.key}
                        def={f}
                        id={id(f.key)}
                        values={row.values}
                        onChange={onChange}
                        badge={
                          several ? (
                            <TripNumber value={index + 1} small />
                          ) : null
                        }
                        textClassName={beside}
                        className="@5xl:flex-none"
                      />
                    ) : (
                      <FieldBox
                        key={f.key}
                        def={f}
                        id={id(f.key)}
                        values={row.values}
                        onChange={onChange}
                        presets={presetsOf?.(f.key)}
                        near={near}
                        invalid={refused(f)}
                        describedBy={messagesId}
                        textClassName={beside}
                        className={`${WIDTH[f.kind] ?? ""} ${
                          // Room on one line for the label and its tick.
                          f.tick?.shown(row.values) ? "@5xl:min-w-[260px]" : ""
                        }`}
                      />
                    ),
                  )}
                  {several ? null : (
                    <div
                      className={`${fieldBox} ${fieldRing} ${
                        groupIssue
                          ? "z-(--layer-raised) border-danger"
                          : "border-card-edge"
                      } @5xl:w-[120px] @5xl:flex-none`}
                    >
                      <label htmlFor={passengersId} className={fieldLabel}>
                        <UsersIcon className="size-[15px] text-muted" />
                        Passengers
                      </label>
                      <NumberField
                        id={passengersId}
                        bare
                        min={0}
                        max={MAX_PASSENGERS}
                        value={passengers}
                        onChange={(e) =>
                          onPassengers(clampPassengers(e.target.value))
                        }
                        aria-invalid={Boolean(groupIssue) || undefined}
                        aria-describedby={groupIssue ? messagesId : undefined}
                        className="h-full min-h-[70px] w-full max-w-[168px] px-3.5 pt-[30px] pb-2 text-ink @5xl:max-w-none"
                      />
                    </div>
                  )}
                </div>
                {messages.length > 0 ? (
                  <p
                    id={messagesId}
                    role="alert"
                    className="mt-2.5 rounded-control bg-danger-tint px-3.5 py-2.5 text-copy text-danger"
                  >
                    {messages.join(" ")}
                  </p>
                ) : null}
              </div>
              {several ? (
                <button
                  type="button"
                  aria-label={`Remove Trip ${index + 1}`}
                  title="Remove Trip"
                  onClick={() => trips.remove(row.id)}
                  className={`${look.remove} focus-ring focus-ring-dark`}
                >
                  <TrashIcon className="size-[18px]" />
                </button>
              ) : (
                <>
                  {last ? <div className={narrowOnly}>{addTrip}</div> : null}
                  {send(besideRow)}
                </>
              )}
            </div>
          );
        })}
      </div>
      {several ? (
        <>
          <div className={`mt-0.5 ${narrowOnly}`}>{addTrip}</div>
          <div className="mt-3 flex flex-col gap-3 @3xl:flex-row @3xl:justify-end">
            <PassengersStepper
              value={passengers}
              onChange={onPassengers}
              invalid={Boolean(groupIssue)}
              describedBy={groupIssue ? groupId : undefined}
              className="w-full @3xl:w-[250px]"
            />
            {send(atFoot)}
          </div>
          {groupIssue ? (
            <p
              id={groupId}
              role="alert"
              className="mt-2.5 rounded-control bg-danger-tint px-3.5 py-2.5 text-copy text-danger @3xl:ml-auto @3xl:w-fit"
            >
              {groupIssue}
            </p>
          ) : null}
        </>
      ) : null}
    </>
  );
}

/** A button among the trips, a small pane of their glass. */
const pill = `${look.chip} inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-copy font-semibold whitespace-nowrap text-white transition hover:brightness-125 focus-ring focus-ring-dark`;

/**
 * "Add Another Trip", in the middle: it adds an empty row whatever the
 * others hold. At the most trips a booking takes it says so instead.
 */
export function AddTrip({
  trips,
  className = "",
}: {
  trips: Trips;
  className?: string;
}) {
  return (
    <div className={`mt-2.5 flex justify-center ${className}`}>
      {trips.full ? (
        <p className={`${pill} font-medium`}>
          A booking takes up to {trips.rows.length} trips.
        </p>
      ) : (
        <button type="button" onClick={trips.add} className={pill}>
          <PlusIcon className="size-4 text-azure-light" />
          Add Another Trip
        </button>
      )}
    </div>
  );
}
