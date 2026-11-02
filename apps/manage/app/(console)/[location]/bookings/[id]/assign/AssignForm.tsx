"use client";

import {
  defaultRespondBy,
  fitAcross,
  formatLocalDateTime,
  localDateTimeInputs,
  PART_ROLE_LABELS,
  PART_ROLES,
  type PartRole,
} from "@repo/db";
import type { Candidate } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Checkbox, Field, Input, Radio } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { FormFoot } from "@repo/console/FormFoot";
import { useActionForm } from "@repo/console/use-action-form";
import { assignAction, type AssignChoices } from "../fulfil-actions";

/** A trip still to assign, as the page lists it. */
export type AssignTrip = {
  id: string;
  position: number;
  startsAt: Date;
  /** "Airport → Datai", or the pickup of an hourly hire. */
  route: string;
  /** The roles it still needs asked for. */
  roles: PartRole[];
};

/** A role's choice: left for later, a vehicle or driver named, or a vendor asked to choose. */
type Choice =
  | { kind: "none" }
  | { kind: "named"; candidate: Candidate }
  | { kind: "ask"; vendorId: string };

const NONE: Choice = { kind: "none" };

/** What one role holds: one choice for every trip, or one per trip by item id. */
type RoleState = {
  same: boolean;
  all: Choice;
  byTrip: Record<string, Choice>;
};

type Vendors = AssignChoices["vendors"];

/** The vendor a choice asks, when it asks one. */
function vendorOf(choice: Choice, vendors: Vendors) {
  if (choice.kind === "named") return choice.candidate.vendor;
  if (choice.kind === "ask")
    return vendors.find((v) => v.id === choice.vendorId);
  return undefined;
}

/** What a choice posts for a trip: "", `vendor:<id>`, or the record's id. */
function postedOf(choice: Choice) {
  if (choice.kind === "named") return choice.candidate.id;
  if (choice.kind === "ask") return `vendor:${choice.vendorId}`;
  return "";
}

/**
 * The Assign page's form: for each role, a vehicle and a driver, one
 * choice for every trip ("Same for every trip", on by default) or one per
 * trip, each named from the picker, ours first, or left to a vendor to
 * choose; either may wait. A vehicle or driver that cannot do a trip is
 * greyed on that trip, with why; for every trip at once, with which trip
 * refuses it. The timing warnings only warn. A vendor not ours is offered
 * an amount per trip, and answers by a time. Sent, it goes back to the
 * booking. See docs/261028-fulfilment-vendors-and-connect.md, "Assigning a
 * booking".
 */
export function AssignForm({
  bookingId,
  back,
  trips,
  choices,
}: {
  bookingId: string;
  /** The booking, in the scope the page was opened in. */
  back: string;
  trips: AssignTrip[];
  choices: AssignChoices;
}) {
  const router = useRouter();
  const blank = (): RoleState => ({ same: true, all: NONE, byTrip: {} });
  const [roles, setRoles] = useState<Record<PartRole, RoleState>>({
    vehicle: blank(),
    driver: blank(),
  });
  const { pending, error, formProps, leaveDialog } = useActionForm(
    assignAction,
    {
      done: "Sent. The trips are assigned once each one accepts.",
      onDone: () => router.push(back),
      leave: "Nothing is sent.",
    },
  );
  const respondBy = localDateTimeInputs(
    defaultRespondBy(trips[0]?.startsAt ?? new Date()),
  );
  const choiceFor = (role: PartRole, tripId: string) => {
    const state = roles[role];
    return state.same ? state.all : (state.byTrip[tripId] ?? NONE);
  };
  const chosen = (role: PartRole) =>
    trips
      .filter((t) => t.roles.includes(role))
      .map((t) => choiceFor(role, t.id));
  const anyChosen = PART_ROLES.some((role) =>
    chosen(role).some((c) => c.kind !== "none"),
  );
  const ourVehicleNamed = chosen("vehicle").some(
    (c) => c.kind === "named" && c.candidate.vendor.isOurs,
  );

  return (
    <form {...formProps} className="grid gap-5">
      <input type="hidden" name="bookingId" value={bookingId} />
      {trips.map((trip) => (
        <input key={trip.id} type="hidden" name="itemId" value={trip.id} />
      ))}

      <Card>
        <CardTitle meta={`${trips.length} to assign`}>Trips</CardTitle>
        <ul className="grid divide-y divide-hairline">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <TripName trip={trip} />
              <span className="flex flex-wrap gap-1.5 sm:ml-auto">
                {trip.roles.map((role) => (
                  <Badge key={role} dot tone="amber">
                    Needs a {role}
                  </Badge>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {PART_ROLES.map((role) => (
        <RoleCard
          key={role}
          role={role}
          trips={trips.filter((t) => t.roles.includes(role))}
          candidates={role === "vehicle" ? choices.vehicles : choices.drivers}
          vendors={choices.vendors}
          state={roles[role]}
          onState={(state) =>
            setRoles((current) => ({ ...current, [role]: state }))
          }
        />
      ))}

      <Card>
        <CardTitle>Answer</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Answer by"
            hint="Unanswered by then, the vendor's part reopens."
          >
            <Input
              name="respondBy"
              type="datetime-local"
              defaultValue={`${respondBy.date}T${respondBy.time}`}
            />
          </Field>
          {ourVehicleNamed ? (
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-body">
              <Checkbox name="acceptOurs" />I checked our vehicle: accept it now
            </label>
          ) : null}
        </div>
      </Card>

      <FormFoot
        submit={
          <Button type="submit" pending={pending} disabled={!anyChosen}>
            Send
          </Button>
        }
        cancelHref={back}
        error={error}
      />
      {leaveDialog}
    </form>
  );
}

/** "Trip 2 · Tue, 3 Nov 2026, 11:45 AM", and its route under it. */
function TripName({ trip }: { trip: AssignTrip }) {
  return (
    <span className="grid min-w-0 gap-0.5">
      <span className="text-sm font-medium text-ink">
        Trip {trip.position} · {formatLocalDateTime(trip.startsAt)}
      </span>
      <span className="truncate text-caption text-muted">{trip.route}</span>
    </span>
  );
}

/**
 * One role across the trips that need it: "Same for every trip", then one
 * picker for them all, or a row per trip with its own picker and amount.
 * Each trip's choice is posted under its id, as the action reads it.
 */
function RoleCard({
  role,
  trips,
  candidates,
  vendors,
  state,
  onState,
}: {
  role: PartRole;
  trips: AssignTrip[];
  candidates: Candidate[];
  vendors: Vendors;
  state: RoleState;
  onState: (state: RoleState) => void;
}) {
  const label = PART_ROLE_LABELS[role];
  if (trips.length === 0) {
    return (
      <Card>
        <CardTitle>{label}</CardTitle>
        <p className="text-sm text-muted">
          Every trip has its {role} asked for already.
        </p>
      </Card>
    );
  }

  // Per trip again: each trip starts from the one choice, unless it cannot
  // take it.
  function setSame(same: boolean) {
    if (same) {
      onState({ ...state, same });
      return;
    }
    const all = state.all;
    const byTrip = Object.fromEntries(
      trips.map((trip) => [
        trip.id,
        all.kind === "named" &&
        (all.candidate.trips[trip.id]?.reasons.length ?? 0) > 0
          ? NONE
          : all,
      ]),
    );
    onState({ ...state, same, byTrip });
  }

  return (
    <Card>
      <CardTitle
        action={
          trips.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-body">
              <Checkbox
                checked={state.same}
                onChange={(event) => setSame(event.target.checked)}
              />
              Same for every trip
            </label>
          ) : null
        }
      >
        {label}
      </CardTitle>
      {trips.map((trip) => {
        const choice = state.same ? state.all : (state.byTrip[trip.id] ?? NONE);
        const vendor = choice.kind === "named" ? choice.candidate.vendor : null;
        return (
          <Fragment key={trip.id}>
            <input
              type="hidden"
              name={`${role}:${trip.id}`}
              value={postedOf(choice)}
            />
            {vendor ? (
              <input
                type="hidden"
                name={`${role}Vendor:${trip.id}`}
                value={vendor.id}
              />
            ) : null}
          </Fragment>
        );
      })}
      {state.same ? (
        <div className="grid gap-4">
          <RoleChoice
            role={role}
            pickerKey="all"
            trips={trips}
            candidates={candidates}
            vendors={vendors}
            choice={state.all}
            onChoice={(all) => onState({ ...state, all })}
          />
          <SharedAmounts
            role={role}
            trips={trips}
            vendor={vendorOf(state.all, vendors)}
          />
        </div>
      ) : (
        <ul className="grid divide-y divide-hairline">
          {trips.map((trip) => {
            const choice = state.byTrip[trip.id] ?? NONE;
            const vendor = vendorOf(choice, vendors);
            return (
              <li
                key={trip.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-5"
              >
                <TripName trip={trip} />
                <div className="grid gap-3">
                  <RoleChoice
                    role={role}
                    pickerKey={trip.id}
                    trips={[trip]}
                    candidates={candidates}
                    vendors={vendors}
                    choice={choice}
                    onChoice={(next) =>
                      onState({
                        ...state,
                        byTrip: { ...state.byTrip, [trip.id]: next },
                      })
                    }
                  />
                  {vendor && !vendor.isOurs ? (
                    <Field label={`What we owe ${vendor.name} (RM)`}>
                      <Input
                        name={`${role}Cost:${trip.id}`}
                        inputMode="decimal"
                        required
                      />
                    </Field>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/**
 * One choice for some trips: left for later, a vendor asked to choose, or
 * one named from the picker. A vehicle or driver that cannot do one of
 * the trips is greyed, with why.
 */
function RoleChoice({
  role,
  pickerKey,
  trips,
  candidates,
  vendors,
  choice,
  onChoice,
}: {
  role: PartRole;
  /** Tells this picker's radios from the others' on the page. */
  pickerKey: string;
  trips: AssignTrip[];
  candidates: Candidate[];
  vendors: Vendors;
  choice: Choice;
  onChoice: (choice: Choice) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={choice.kind === "none" ? "primary" : "secondary"}
          onClick={() => onChoice(NONE)}
        >
          Not now
        </Button>
        <Button
          size="sm"
          variant={choice.kind === "ask" ? "primary" : "secondary"}
          onClick={() =>
            onChoice({
              kind: "ask",
              vendorId:
                vendors.find((v) => !v.isOurs)?.id ?? vendors[0]?.id ?? "",
            })
          }
        >
          Ask a vendor to choose
        </Button>
      </div>
      {choice.kind === "ask" ? (
        <Select
          aria-label="Vendor"
          value={choice.vendorId}
          onValueChange={(vendorId) => onChoice({ kind: "ask", vendorId })}
          options={vendors.map((v) => ({
            value: v.id,
            label: v.isOurs ? `${v.name} (ours)` : v.name,
          }))}
        />
      ) : null}
      <ul className="grid max-h-80 divide-y divide-hairline overflow-y-auto">
        {candidates.length === 0 ? (
          <li className="py-2 text-sm text-muted">No {role} in service.</li>
        ) : (
          candidates.map((candidate) => {
            const fit = fitAcross(candidate.trips, trips);
            const usable = fit.reasons.length === 0;
            const picked =
              choice.kind === "named" && choice.candidate.id === candidate.id;
            return (
              <li key={candidate.id}>
                <label
                  className={cx(
                    "flex gap-3 rounded-control px-2 py-2.5 text-sm",
                    picked && "bg-hairline",
                    usable ? "cursor-pointer hover:bg-shade" : "text-muted",
                  )}
                >
                  <Radio
                    name={`${role}Pick:${pickerKey}`}
                    className="mt-0.5"
                    disabled={!usable}
                    checked={picked}
                    onChange={() => onChoice({ kind: "named", candidate })}
                  />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{candidate.name}</span>
                      {candidate.vendor.isOurs ? (
                        <Badge tone="brand">Ours</Badge>
                      ) : (
                        <span className="text-caption">
                          {candidate.vendor.name}
                        </span>
                      )}
                      <span className="text-caption text-muted">
                        {candidate.locationName}
                      </span>
                    </span>
                    {fit.reasons.map((reason) => (
                      <span key={reason} className="text-caption">
                        {reason}
                      </span>
                    ))}
                    {fit.warnings.map((warning) => (
                      <span key={warning} className="text-caption text-warning">
                        {warning}
                      </span>
                    ))}
                    {candidate.day.map((line) => (
                      <span key={line} className="text-caption text-muted">
                        {line}
                      </span>
                    ))}
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

/**
 * What we owe a vendor not ours for one choice across the trips: one
 * amount for every trip ("Same amount for every trip"), or one per trip.
 * The one amount is posted under the first trip and copied to the rest.
 */
function SharedAmounts({
  role,
  trips,
  vendor,
}: {
  role: PartRole;
  trips: AssignTrip[];
  vendor: { name: string; isOurs: boolean } | undefined;
}) {
  const [same, setSame] = useState(true);
  const [amount, setAmount] = useState("");
  if (!vendor || vendor.isOurs) return null;
  const [first, ...rest] = trips;
  if (!first) return null;

  return (
    <div className="grid gap-3 border-t border-hairline pt-4">
      {trips.length > 1 ? (
        <label className="flex items-center gap-2 text-sm text-body">
          <Checkbox
            checked={same}
            onChange={(event) => setSame(event.target.checked)}
          />
          Same amount for every trip
        </label>
      ) : null}
      {same ? (
        <>
          <Field label={`What we owe ${vendor.name} per trip (RM)`}>
            <Input
              name={`${role}Cost:${first.id}`}
              inputMode="decimal"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          {rest.map((trip) => (
            <input
              key={trip.id}
              type="hidden"
              name={`${role}Cost:${trip.id}`}
              value={amount}
            />
          ))}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {trips.map((trip) => (
            <Field
              key={trip.id}
              label={`Trip ${trip.position}, ${formatLocalDateTime(trip.startsAt)} (RM)`}
            >
              <Input
                name={`${role}Cost:${trip.id}`}
                inputMode="decimal"
                required
              />
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}
