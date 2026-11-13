"use client";

import {
  BOOKING_RULES,
  candidateOption,
  defaultRespondBy,
  formatLocalDateTime,
  localDateTimeInputs,
  PART_ROLE_LABELS,
  vendorGroupsOf,
  type AssignTrip,
  type PartRole,
} from "@repo/db";
import type { Candidate, VendorOption } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { DateTimeField } from "@repo/ui/date-field";
import { Checkbox, Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { useActionForm } from "@repo/console/use-action-form";
import { assignAction } from "../actions";

/** A vehicle or driver left to its vendor to assign; also no vendor chosen yet. */
const ANY = "";

type Moment = { date: string; time: string };

/** A vendor's own of the role, those of the class booked unless `others`. */
function ownOf(
  candidates: readonly Candidate[],
  vendorId: string,
  tripId: string,
  others: boolean,
) {
  return candidates.filter(
    (c) => c.vendor.id === vendorId && (others || !c.trips[tripId]?.otherClass),
  );
}

/** How a vendor reads in the list: an individual as "Individual · Ali bin Abu", the driver they are. */
function vendorLabel(vendor: VendorOption) {
  return vendor.kind === "individual"
    ? `Individual · ${vendor.name}`
    : vendor.name;
}

/** An individual with their one driver (or car) filled in: it is them, so no Any. */
function selfDriven(
  vendor: VendorOption | null,
  own: readonly Candidate[],
  value: string,
): boolean {
  return (
    vendor?.kind === "individual" && own.length === 1 && own[0]!.id === value
  );
}

/** The one a vendor has that can do the trip, so it is filled in: an individual and their own car or self. */
function onlyOne(own: readonly Candidate[], tripId: string) {
  const usable = own.filter(
    (c) => (c.trips[tripId]?.reasons.length ?? 0) === 0,
  );
  return own.length === 1 && usable.length === 1 ? usable[0]!.id : ANY;
}

/**
 * One role of a trip still to assign, the vehicle, the driver or the tour
 * guide, in its own card: its vendor first, grouped by what each offers
 * (ours, Vehicle and driver, Vehicle only, Driver only, Tour guide), then
 * one of that vendor's, filled in when it has only one, or Any, which the
 * vendor assigns. A vehicle lists the class booked; "Assign others"
 * lists the rest. With `withDriver` (the tick above the cards) the
 * vehicle's card asks the driver from the same vendor too, one amount for
 * both. An individual reads "Individual · name" and is their own driver,
 * named at once. What we pay
 * is per trip: the booking's other trips still needing the role can be
 * given the same, all at once with "All Trips", each with its own amount.
 * When the vendor answers by, before the pickup; for our vehicle or guide,
 * the acceptance now. Sent, the vendor accepts before the role is
 * settled. See docs/261028-fulfilment-vendors-and-connect.md, "Assigning
 * a booking", and docs/261111-catalogue-booking-flow-and-ops.md, part D.
 */
export function AssignForm({
  bookingId,
  role,
  trip,
  others,
  candidates,
  driverCandidates = [],
  withDriver = false,
  vendors,
}: {
  bookingId: string;
  role: PartRole;
  trip: AssignTrip;
  /** The booking's other trips still needing this role, in order. */
  others: AssignTrip[];
  /** This role's vehicles, drivers or guides. */
  candidates: Candidate[];
  /** For a vehicle with its driver: the drivers. */
  driverCandidates?: Candidate[];
  /** The vehicle and its driver from one vendor, paid together: the tick above the cards. */
  withDriver?: boolean;
  /** The active vendors serving the trip's location, ours first. */
  vendors: VendorOption[];
}) {
  const [vendorId, setVendorId] = useState(ANY);
  const [record, setRecord] = useState(ANY);
  const [showOthers, setShowOthers] = useState(false);
  const [driver, setDriver] = useState(ANY);
  const [cost, setCost] = useState("");
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [tip, setTip] = useState("");
  const [also, setAlso] = useState<ReadonlySet<string>>(new Set());
  // Untouched, Answer by follows the earliest trip posted.
  const [respondByEdit, setRespondByEdit] = useState<Moment | null>(null);
  const label = PART_ROLE_LABELS[role];
  const noun = label.toLowerCase();
  const { pending, error, formProps } = useActionForm(assignAction, {
    done: `${withDriver ? "Vehicle and driver" : label} asked for. Trip ${trip.position} is assigned once each one accepts.`,
  });

  const vendor = vendors.find((v) => v.id === vendorId) ?? null;
  const allOwn = vendor ? ownOf(candidates, vendor.id, trip.id, true) : [];
  const own = vendor ? ownOf(candidates, vendor.id, trip.id, showOthers) : [];
  const hasOtherClass =
    role === "vehicle" && allOwn.some((c) => c.trips[trip.id]?.otherClass);
  const candidate = candidates.find((c) => c.id === record) ?? null;
  const fit = candidate?.trips[trip.id];
  const pick = !vendor ? "" : record === ANY ? `vendor:${vendor.id}` : record;

  // The driver from the same vendor, when the tick above the cards asks.
  const takesDriver = role === "vehicle" && withDriver;
  const ownDrivers = vendor
    ? ownOf(driverCandidates, vendor.id, trip.id, true)
    : [];
  const driverCandidate = driverCandidates.find((c) => c.id === driver) ?? null;
  const driverPick = !vendor
    ? ""
    : driver === ANY
      ? `vendor:${vendor.id}`
      : driver;

  // Who the pay goes to: the vendor for a vehicle, the person for the rest.
  const payee = takesDriver
    ? `Pay ${vendor?.name ?? "the vendor"} for the vehicle and driver`
    : role === "vehicle"
      ? `Pay ${vendor?.name ?? "the vendor"}`
      : `Pay the ${noun}`;
  // A coach trip's driver is given a tip, ours too.
  const tipRole: PartRole | null =
    role === "driver" ? "driver" : takesDriver ? "driver" : null;
  const tipped = tipRole !== null && trip.tipped;
  const paid = vendor !== null && !vendor.isOurs;

  /** Why another trip cannot take the same, or null when it can. */
  const blockOf = (other: AssignTrip) =>
    candidate?.trips[other.id]?.reasons[0] ??
    (takesDriver && other.roles.includes("driver")
      ? (driverCandidate?.trips[other.id]?.reasons[0] ?? null)
      : null);

  // The trips this posts for: this one, and the others ticked that can take it.
  const posted = [
    trip,
    ...others.filter((o) => also.has(o.id) && blockOf(o) === null),
  ];
  const firstPickup = new Date(
    Math.min(...posted.map((t) => t.startsAt.getTime())),
  );
  const respondBy =
    respondByEdit ?? localDateTimeInputs(defaultRespondBy(firstPickup));
  // The last moment it can be: a minute before the first pickup.
  const last = localDateTimeInputs(new Date(firstPickup.getTime() - 60_000));
  const allTicked = others.every((o) => blockOf(o) !== null || also.has(o.id));

  function chooseVendor(next: string) {
    setVendorId(next);
    setShowOthers(false);
    setRecord(onlyOne(ownOf(candidates, next, trip.id, false), trip.id));
    setDriver(onlyOne(ownOf(driverCandidates, next, trip.id, true), trip.id));
  }

  function tick(id: string, on: boolean) {
    setAlso((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      {/* Untouched, the server works it out when it is sent. */}
      {vendor && respondByEdit ? (
        <input
          type="hidden"
          name={`respondBy:${vendor.id}`}
          value={
            respondBy.date && respondBy.time
              ? `${respondBy.date}T${respondBy.time}`
              : ""
          }
        />
      ) : null}
      {/* Each trip's choice under its id, as the action reads it. Each
          trip's amount is its own visible field, so a refusal shows there. */}
      {posted.map((t) => (
        <span key={t.id} hidden>
          <input type="hidden" name="itemId" value={t.id} />
          <input type="hidden" name={`${role}:${t.id}`} value={pick} />
          {vendor && record !== ANY ? (
            <input
              type="hidden"
              name={`${role}Vendor:${t.id}`}
              value={vendor.id}
            />
          ) : null}
          {takesDriver && t.roles.includes("driver") ? (
            <>
              <input type="hidden" name={`driver:${t.id}`} value={driverPick} />
              {driver !== ANY && vendor ? (
                <input
                  type="hidden"
                  name={`driverVendor:${t.id}`}
                  value={vendor.id}
                />
              ) : null}
            </>
          ) : null}
          {vendor && tipped && tipRole && t.tipped && t.id !== trip.id ? (
            <input type="hidden" name={`${tipRole}Tip:${t.id}`} value={tip} />
          ) : null}
        </span>
      ))}

      <div
        className={`grid gap-3 ${takesDriver ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        <Field label="Vendor">
          {/* Named by its role, as the writer names it when it refuses. */}
          <Select
            name={role}
            value={vendorId}
            placeholder="Choose a vendor"
            onValueChange={chooseVendor}
            options={vendorGroupsOf(vendors).map((group) => ({
              label: group.label,
              options: group.vendors.map((v) => ({
                value: v.id,
                label: vendorLabel(v),
              })),
            }))}
          />
        </Field>
        <Field label={label}>
          <Select
            value={record}
            disabled={!vendor}
            onValueChange={setRecord}
            options={[
              ...(selfDriven(vendor, own, record)
                ? []
                : [
                    {
                      value: ANY,
                      label: vendor?.isOurs
                        ? "Any, We Name It Later"
                        : "Any, the Vendor Assigns",
                    },
                  ]),
              ...own.map((c) => candidateOption(c, [trip.id])),
            ]}
          />
        </Field>
        {takesDriver ? (
          <Field label="Driver">
            <Select
              value={driver}
              disabled={!vendor}
              onValueChange={setDriver}
              options={[
                ...(selfDriven(vendor, ownDrivers, driver)
                  ? []
                  : [
                      {
                        value: ANY,
                        label: vendor?.isOurs
                          ? "Any, We Name It Later"
                          : "Any, the Vendor Assigns",
                      },
                    ]),
                ...ownDrivers.map((c) => candidateOption(c, [trip.id])),
              ]}
            />
          </Field>
        ) : null}
      </div>
      {takesDriver
        ? driverCandidate?.trips[trip.id]?.warnings.map((warning) => (
            <p key={warning} className="text-caption text-warning">
              {warning}
            </p>
          ))
        : null}
      {hasOtherClass ? (
        <label className="flex items-center gap-2 text-sm text-body">
          <Checkbox
            checked={showOthers}
            onChange={(event) => {
              const on = event.currentTarget.checked;
              setShowOthers(on);
              if (!on && candidate?.trips[trip.id]?.otherClass) {
                setRecord(ANY);
              }
            }}
          />
          Assign others: list vehicles of every class
        </label>
      ) : null}
      {vendor && record === ANY ? (
        <p className="rounded-control bg-shade px-3 py-2 text-sm text-body">
          {vendor.isOurs
            ? `No ${noun} named yet: name it here once you know.`
            : `${vendor.name} will assign the ${noun}. You see who once they do.`}
        </p>
      ) : null}
      {fit?.warnings.map((warning) => (
        <p key={warning} className="text-caption text-warning">
          {warning}
        </p>
      ))}
      {candidate?.day.map((line) => (
        <p key={line} className="text-caption text-muted">
          {line}
        </p>
      ))}

      {vendor ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {paid ? (
            <Field
              label={`${payee}${posted.length > 1 ? `, trip ${trip.position}` : ""} (RM)`}
            >
              <Input
                name={`${role}Cost:${trip.id}`}
                inputMode="decimal"
                required
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                placeholder="120.00"
              />
            </Field>
          ) : null}
          {tipped && tipRole ? (
            <Field
              label={`Driver Tip ${posted.length > 1 ? "per trip " : ""}(RM)`}
              hint="Out of what the customer paid, to the driver themselves."
            >
              <Input
                name={`${tipRole}Tip:${trip.id}`}
                inputMode="decimal"
                value={tip}
                onChange={(event) => setTip(event.target.value)}
                placeholder="0.00"
              />
            </Field>
          ) : null}
          <Field
            label="Answer By"
            hint="Before the pickup. Unanswered by then, it opens again."
          >
            <DateTimeField
              title="Answer By"
              value={respondBy}
              onChange={setRespondByEdit}
              max={last.date}
              maxTime={last.time}
              timeZone={BOOKING_RULES.timeZone}
            />
          </Field>
        </div>
      ) : null}

      {vendor?.isOurs && role !== "driver" ? (
        <label className="flex items-center gap-2 text-sm text-body">
          <Checkbox name="acceptOurs" />I checked our {noun}: accept it now
        </label>
      ) : null}

      {others.length > 0 && vendor ? (
        <fieldset className="grid gap-2 rounded-control bg-shade p-3">
          <legend className="sr-only">Also Give the Same To</legend>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">
              Also Give the Same To
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={allTicked}
              onClick={() =>
                setAlso(
                  new Set(
                    others.filter((o) => blockOf(o) === null).map((o) => o.id),
                  ),
                )
              }
            >
              All Trips
            </Button>
          </div>
          {others.map((other) => {
            const block = blockOf(other);
            const ticked = block === null && also.has(other.id);
            return (
              <div
                key={other.id}
                className="grid gap-2 sm:grid-cols-[1fr_10rem] sm:items-center"
              >
                <label className="flex items-start gap-2 text-sm text-body">
                  <Checkbox
                    className="mt-0.5"
                    disabled={block !== null}
                    checked={ticked}
                    onChange={(event) =>
                      tick(other.id, event.currentTarget.checked)
                    }
                  />
                  <span className="grid gap-0.5">
                    <span>
                      Trip {other.position} ·{" "}
                      {formatLocalDateTime(other.startsAt)}
                    </span>
                    <span className="text-caption text-muted">
                      {block ?? other.route}
                    </span>
                  </span>
                </label>
                {ticked && paid ? (
                  <Input
                    name={`${role}Cost:${other.id}`}
                    aria-label={`${payee}, trip ${other.position} (RM)`}
                    inputMode="decimal"
                    required
                    value={costs[other.id] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCosts((now) => ({ ...now, [other.id]: value }));
                    }}
                    placeholder="RM, this trip"
                  />
                ) : null}
              </div>
            );
          })}
        </fieldset>
      ) : null}

      <FormError error={error} />
      <div className="flex justify-end">
        <Button type="submit" pending={pending} disabled={!vendor}>
          {`Assign ${takesDriver ? "vehicle and driver" : noun}${
            posted.length > 1 ? ` to ${posted.length} trips` : ""
          }`}
        </Button>
      </div>
    </form>
  );
}
