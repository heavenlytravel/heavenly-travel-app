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
import type { Candidate } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { DateTimeField } from "@repo/ui/date-field";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { Checkbox, Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { Loading } from "@repo/ui/skeleton";
import { FieldsSkeleton } from "@repo/console/Skeleton";
import { Select } from "@repo/ui/select";
import { useRef, useState, useTransition } from "react";
import { useActionForm } from "@repo/console/use-action-form";
import {
  assignAction,
  loadAssignChoices,
  type AssignChoices,
} from "../[id]/fulfil-actions";

/** A role's choice as its picker holds it: "" for not now, `vendor:<id>`, or a vehicle's or driver's id. */
type RoleChoice = string;

const NOT_NOW = "";
/** A role's vehicle or driver left to its vendor to assign. */
const ANY = "";

/**
 * "Assign" on one trip, on the booking and on the Assign page alike: a
 * small dialog with the vehicle and the driver it still needs, each by its
 * vendor first (ours first, or not now), then one of that vendor's (one
 * that cannot do the trip greyed with why) or Any, which the vendor
 * assigns, said plainly under it; what we pay a vendor that is not ours;
 * when they answer by; and the booking's other trips still open, to give
 * the same. A trip ticked that a choice cannot do cannot be ticked, with
 * why. Sent, each one asked accepts before the trip is assigned. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Assigning a booking".
 */
export function AssignTripButton({
  bookingId,
  trip,
  others,
  label = "Assign",
  size = "sm",
  variant = "primary",
}: {
  bookingId: string;
  trip: AssignTrip;
  /** The booking's other trips still to assign, in order. */
  others: AssignTrip[];
  label?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<AssignChoices | null>(null);
  const [failed, setFailed] = useState(false);
  const [, startLoading] = useTransition();
  // Each opening starts a fresh form and reads who is free now; an answer
  // to an earlier opening that comes late is dropped.
  const [opening, setOpening] = useState(0);
  const latest = useRef(0);

  function openDialog() {
    const ask = latest.current + 1;
    latest.current = ask;
    setOpen(true);
    setFailed(false);
    setChoices(null);
    setOpening(ask);
    startLoading(async () => {
      try {
        const loaded = await loadAssignChoices(bookingId);
        if (latest.current !== ask) return;
        if (loaded) setChoices(loaded);
        else setFailed(true);
      } catch {
        if (latest.current === ask) setFailed(true);
      }
    });
  }

  return (
    <>
      <Button size={size} variant={variant} onClick={openDialog}>
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Assign trip ${trip.position}`}
        description={`${formatLocalDateTime(trip.startsAt)} · ${trip.route}`}
        width="md"
      >
        {failed ? (
          <p className="text-sm text-danger">
            Who is free could not be read, or your teams cannot assign. Close
            and try again, or ask a SUPER admin.
          </p>
        ) : !choices ? (
          <Loading label="Loading who is free">
            <FieldsSkeleton />
          </Loading>
        ) : (
          <AssignTripForm
            key={opening}
            bookingId={bookingId}
            trip={trip}
            others={others}
            choices={choices}
            onDone={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </Dialog>
    </>
  );
}

function AssignTripForm({
  bookingId,
  trip,
  others,
  choices,
  onDone,
  onCancel,
}: {
  bookingId: string;
  trip: AssignTrip;
  others: AssignTrip[];
  choices: AssignChoices;
  onDone: () => void;
  onCancel: () => void;
}) {
  // Each role: its vendor first ("" not now), then one of that vendor's
  // vehicles or drivers, or "" for any, which the vendor assigns.
  const [vendorIds, setVendorIds] = useState<Record<PartRole, string>>({
    vehicle: "",
    driver: "",
  });
  const [records, setRecords] = useState<Record<PartRole, string>>({
    vehicle: ANY,
    driver: ANY,
  });
  const choiceOf = (role: PartRole): RoleChoice => {
    const vendorId = vendorIds[role];
    if (!vendorId) return NOT_NOW;
    return records[role] === ANY ? `vendor:${vendorId}` : records[role];
  };
  const picks: Record<PartRole, RoleChoice> = {
    vehicle: choiceOf("vehicle"),
    driver: choiceOf("driver"),
  };
  const [costs, setCosts] = useState<Record<PartRole, string>>({
    vehicle: "",
    driver: "",
  });
  const [also, setAlso] = useState<ReadonlySet<string>>(new Set());
  // Untouched, Answer by follows the earliest trip being assigned.
  const [respondByEdit, setRespondByEdit] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const { pending, error, formProps } = useActionForm(assignAction, {
    done: `Sent. Trip ${trip.position} is assigned once each one accepts.`,
    onDone,
  });

  const candidatesOf = (role: PartRole) =>
    role === "vehicle" ? choices.vehicles : choices.drivers;
  const candidateOf = (role: PartRole): Candidate | null =>
    candidatesOf(role).find((c) => c.id === picks[role]) ?? null;
  const vendorOf = (role: PartRole) => {
    const pick = picks[role];
    if (pick.startsWith("vendor:")) {
      return choices.vendors.find((v) => `vendor:${v.id}` === pick) ?? null;
    }
    return candidateOf(role)?.vendor ?? null;
  };
  const chosen = trip.roles.filter((role) => picks[role] !== NOT_NOW);
  const ourVehicle =
    picks.vehicle !== NOT_NOW && candidateOf("vehicle")?.vendor.isOurs === true;

  /** Why another trip cannot take the same, or null when it can. */
  function blockOf(other: AssignTrip): string | null {
    const shared = chosen.filter((role) => other.roles.includes(role));
    if (shared.length === 0) {
      return "Already has what is chosen here";
    }
    for (const role of shared) {
      const reason = candidateOf(role)?.trips[other.id]?.reasons[0];
      if (reason) return reason;
    }
    return null;
  }

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

  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input
        type="hidden"
        name="respondBy"
        value={
          respondBy.date && respondBy.time
            ? `${respondBy.date}T${respondBy.time}`
            : ""
        }
      />
      {posted.map((t) => (
        <input key={t.id} type="hidden" name="itemId" value={t.id} />
      ))}
      {/* Each trip's choice under its id, as the action reads it. This
          trip's amount is its visible field, so a refusal shows there. */}
      {posted.flatMap((t) =>
        t.roles.map((role) => {
          const pick = picks[role];
          const vendor = vendorOf(role);
          return (
            <span key={`${t.id}:${role}`} hidden>
              <input type="hidden" name={`${role}:${t.id}`} value={pick} />
              {vendor && !pick.startsWith("vendor:") ? (
                <input
                  type="hidden"
                  name={`${role}Vendor:${t.id}`}
                  value={vendor.id}
                />
              ) : null}
              {vendor && !vendor.isOurs && t.id !== trip.id ? (
                <input
                  type="hidden"
                  name={`${role}Cost:${t.id}`}
                  value={costs[role]}
                />
              ) : null}
            </span>
          );
        }),
      )}

      {trip.roles.map((role) => {
        const candidate = candidateOf(role);
        const vendor = vendorOf(role);
        const fit = candidate?.trips[trip.id];
        const own = vendorIds[role]
          ? candidatesOf(role).filter((c) => c.vendor.id === vendorIds[role])
          : [];
        const any = vendor !== null && records[role] === ANY;
        return (
          <fieldset key={role} className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-ink">
              {PART_ROLE_LABELS[role]}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vendor">
                {/* Named by its role, as the writer names it when it refuses. */}
                <Select
                  name={role}
                  value={vendorIds[role]}
                  onValueChange={(vendorId) => {
                    setVendorIds((current) => ({
                      ...current,
                      [role]: vendorId,
                    }));
                    setRecords((current) => ({ ...current, [role]: ANY }));
                  }}
                  options={[
                    { value: NOT_NOW, label: "Not now" },
                    ...choices.vendors.map((v) => ({
                      value: v.id,
                      label: v.isOurs ? `${v.name} (ours)` : v.name,
                    })),
                  ]}
                />
              </Field>
              <Field label={PART_ROLE_LABELS[role]}>
                <Select
                  value={records[role]}
                  disabled={!vendorIds[role]}
                  onValueChange={(record) =>
                    setRecords((current) => ({ ...current, [role]: record }))
                  }
                  options={[
                    {
                      value: ANY,
                      label: vendor?.isOurs
                        ? `Any, we name it later`
                        : `Any, the vendor assigns`,
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
            {any ? (
              <p className="rounded-control bg-shade px-3 py-2 text-sm text-body">
                {vendor.isOurs
                  ? `No ${role} named yet: name it on the booking once you know.`
                  : `${vendor.name} will assign the ${role}. You see who once they do.`}
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
            {vendor && !vendor.isOurs ? (
              <Field
                label={
                  posted.length > 1
                    ? `Pay ${vendor.name} per trip (RM)`
                    : `Pay ${vendor.name} (RM)`
                }
              >
                <Input
                  name={`${role}Cost:${trip.id}`}
                  inputMode="decimal"
                  required
                  value={costs[role]}
                  onChange={(event) =>
                    setCosts((current) => ({
                      ...current,
                      [role]: event.target.value,
                    }))
                  }
                  placeholder="120.00"
                />
              </Field>
            ) : null}
          </fieldset>
        );
      })}

      {chosen.length > 0 ? (
        <Field
          label="Answer by"
          hint="Unanswered by then, the trip opens again."
        >
          <DateTimeField
            title="Answer by"
            value={respondBy}
            onChange={setRespondByEdit}
            timeZone={BOOKING_RULES.timeZone}
          />
        </Field>
      ) : null}

      {ourVehicle ? (
        <label className="flex items-center gap-2 text-sm text-body">
          <Checkbox name="acceptOurs" />I checked our vehicle: accept it now
        </label>
      ) : null}

      {others.length > 0 && chosen.length > 0 ? (
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
      <DialogActions>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" pending={pending} disabled={chosen.length === 0}>
          {posted.length > 1 ? `Assign ${posted.length} trips` : "Assign"}
        </Button>
      </DialogActions>
    </form>
  );
}
