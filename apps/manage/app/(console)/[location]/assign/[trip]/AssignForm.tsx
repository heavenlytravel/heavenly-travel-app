"use client";

import {
  BOOKING_RULES,
  defaultRespondBy,
  formatLocalDateTime,
  localDateTimeInputs,
  PART_ROLE_LABELS,
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

/**
 * One role of a trip still to assign, the vehicle, the driver or the tour
 * guide, in its own card: its vendor first (ours first), then one of that vendor's (one
 * that cannot do the trip greyed with why) or Any, which the vendor
 * assigns, said plainly under it; what we pay, a vendor that is not ours
 * for a vehicle, the driver or guide themselves for theirs, and a coach
 * driver's tip;
 * when the vendor answers by, before the pickup; for our vehicle or guide,
 * the acceptance now; and the booking's other trips still needing this role,
 * to give the same. Sent, the vendor accepts before the role is settled.
 * See docs/261028-fulfilment-vendors-and-connect.md, "Assigning a booking".
 */
export function AssignForm({
  bookingId,
  role,
  trip,
  others,
  candidates,
  vendors,
}: {
  bookingId: string;
  role: PartRole;
  trip: AssignTrip;
  /** The booking's other trips still needing this role, in order. */
  others: AssignTrip[];
  /** This role's vehicles, drivers or guides. */
  candidates: Candidate[];
  /** The active vendors serving the trip's location, ours first. */
  vendors: VendorOption[];
}) {
  const [vendorId, setVendorId] = useState(ANY);
  const [record, setRecord] = useState(ANY);
  const [cost, setCost] = useState("");
  const [tip, setTip] = useState("");
  const [also, setAlso] = useState<ReadonlySet<string>>(new Set());
  // Untouched, Answer by follows the earliest trip posted.
  const [respondByEdit, setRespondByEdit] = useState<Moment | null>(null);
  const label = PART_ROLE_LABELS[role];
  const noun = label.toLowerCase();
  const { pending, error, formProps } = useActionForm(assignAction, {
    done: `${label} asked for. Trip ${trip.position} is assigned once each one accepts.`,
  });

  const vendor = vendors.find((v) => v.id === vendorId) ?? null;
  const candidate = candidates.find((c) => c.id === record) ?? null;
  const own = vendor ? candidates.filter((c) => c.vendor.id === vendor.id) : [];
  const fit = candidate?.trips[trip.id];
  const pick = !vendor ? "" : record === ANY ? `vendor:${vendor.id}` : record;

  // Who the pay goes to: the vendor for a vehicle, the person for the rest.
  const payee =
    role === "vehicle"
      ? `Pay ${vendor?.name ?? "the vendor"}`
      : `Pay the ${noun}`;
  // A coach trip's driver is given a tip, ours too.
  const tipped = role === "driver" && trip.tipped;

  /** Why another trip cannot take the same, or null when it can. */
  const blockOf = (other: AssignTrip) =>
    candidate?.trips[other.id]?.reasons[0] ?? null;

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
      {/* Each trip's choice under its id, as the action reads it. This
          trip's amount is its visible field, so a refusal shows there. */}
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
          {vendor && !vendor.isOurs && t.id !== trip.id ? (
            <input type="hidden" name={`${role}Cost:${t.id}`} value={cost} />
          ) : null}
          {vendor && tipped && t.tipped && t.id !== trip.id ? (
            <input type="hidden" name={`${role}Tip:${t.id}`} value={tip} />
          ) : null}
        </span>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vendor">
          {/* Named by its role, as the writer names it when it refuses. */}
          <Select
            name={role}
            value={vendorId}
            placeholder="Choose a vendor"
            onValueChange={(next) => {
              setVendorId(next);
              setRecord(ANY);
            }}
            options={vendors.map((v) => ({
              value: v.id,
              label: v.isOurs ? `${v.name} (ours)` : v.name,
            }))}
          />
        </Field>
        <Field label={label}>
          <Select
            value={record}
            disabled={!vendor}
            onValueChange={setRecord}
            options={[
              {
                value: ANY,
                label: vendor?.isOurs
                  ? "Any, we name it later"
                  : "Any, the vendor assigns",
              },
              ...own.map((c) => {
                const reason = c.trips[trip.id]?.reasons[0];
                return {
                  value: c.id,
                  label: reason ? `${c.name} · ${reason}` : c.name,
                  disabled: reason !== undefined,
                };
              }),
            ]}
          />
        </Field>
      </div>
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
          {!vendor.isOurs ? (
            <Field
              label={`${payee} ${posted.length > 1 ? "per trip " : ""}(RM)`}
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
          {tipped ? (
            <Field
              label={`Driver tip ${posted.length > 1 ? "per trip " : ""}(RM)`}
              hint="Out of what the customer paid, to the driver themselves."
            >
              <Input
                name={`${role}Tip:${trip.id}`}
                inputMode="decimal"
                value={tip}
                onChange={(event) => setTip(event.target.value)}
                placeholder="0.00"
              />
            </Field>
          ) : null}
          <Field
            label="Answer by"
            hint="Before the pickup. Unanswered by then, it opens again."
          >
            <DateTimeField
              title="Answer by"
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
          <legend className="sr-only">Also give the same to</legend>
          <p className="text-sm font-medium text-ink">Also give the same to</p>
          {others.map((other) => {
            const block = blockOf(other);
            return (
              <label
                key={other.id}
                className="flex items-start gap-2 text-sm text-body"
              >
                <Checkbox
                  className="mt-0.5"
                  disabled={block !== null}
                  checked={block === null && also.has(other.id)}
                  onChange={(event) =>
                    setAlso((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(other.id);
                      else next.delete(other.id);
                      return next;
                    })
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
            );
          })}
        </fieldset>
      ) : null}

      <FormError error={error} />
      <div className="flex justify-end">
        <Button type="submit" pending={pending} disabled={!vendor}>
          {posted.length > 1
            ? `Assign ${noun} to ${posted.length} trips`
            : `Assign ${noun}`}
        </Button>
      </div>
    </form>
  );
}
