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
import { Select, type SelectGroup, type SelectOption } from "@repo/ui/select";
import { useState, useTransition } from "react";
import { useActionForm } from "@repo/console/use-action-form";
import {
  assignAction,
  loadAssignChoices,
  type AssignChoices,
} from "../[id]/fulfil-actions";

/** A role's choice as its picker holds it: "" for not now, `vendor:<id>`, or a vehicle's or driver's id. */
type Pick = string;

const NOT_NOW = "";

/**
 * "Assign" on one trip, on the booking and on the Assign page alike: a
 * small dialog with the vehicle and the driver it still needs, each named
 * from the picker (ours first, one that cannot do the trip greyed with
 * why), left to a vendor to choose, or not now; what we pay a vendor that
 * is not ours; when they answer by; and the booking's other trips still
 * open, to give the same. A trip ticked that a choice cannot do cannot be
 * ticked, with why. Sent, each one asked accepts before the trip is
 * assigned. See docs/261028-fulfilment-vendors-and-connect.md, "Assigning
 * a booking".
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
  const [loading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    startLoading(async () => {
      const loaded = await loadAssignChoices(bookingId);
      if (!loaded) {
        setError("Your teams cannot assign. Ask a SUPER admin.");
        return;
      }
      setChoices(loaded);
      setOpen(true);
    });
  }

  return (
    <span className="inline-grid justify-items-end gap-1">
      <Button
        size={size}
        variant={variant}
        onClick={openDialog}
        pending={loading}
      >
        {label}
      </Button>
      <FormError error={error} size="xs" />
      {choices ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title={`Assign trip ${trip.position}`}
          description={`${formatLocalDateTime(trip.startsAt)} · ${trip.route}`}
          width="md"
        >
          <AssignTripForm
            key={open ? "open" : "closed"}
            bookingId={bookingId}
            trip={trip}
            others={others}
            choices={choices}
            onDone={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </Dialog>
      ) : null}
    </span>
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
  const [picks, setPicks] = useState<Record<PartRole, Pick>>({
    vehicle: NOT_NOW,
    driver: NOT_NOW,
  });
  const [costs, setCosts] = useState<Record<PartRole, string>>({
    vehicle: "",
    driver: "",
  });
  const [also, setAlso] = useState<ReadonlySet<string>>(new Set());
  const [respondBy, setRespondBy] = useState(() =>
    localDateTimeInputs(defaultRespondBy(trip.startsAt)),
  );
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
              {vendor && !vendor.isOurs ? (
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
        return (
          <div key={role} className="grid gap-2">
            <Field label={PART_ROLE_LABELS[role]}>
              <Select
                value={picks[role]}
                onValueChange={(pick) =>
                  setPicks((current) => ({ ...current, [role]: pick }))
                }
                options={optionsOf(
                  role,
                  candidatesOf(role),
                  choices.vendors,
                  trip.id,
                )}
              />
            </Field>
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
              <Field label={`Pay ${vendor.name} (RM)`}>
                <Input
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
          </div>
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
            onChange={setRespondBy}
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

/**
 * A role's picker: not now, then each vendor's vehicles or drivers, ours
 * first, one that cannot do the trip disabled with why; then the vendors
 * that may choose for us.
 */
function optionsOf(
  role: PartRole,
  candidates: readonly Candidate[],
  vendors: AssignChoices["vendors"],
  tripId: string,
): (SelectOption | SelectGroup)[] {
  const byVendor = new Map<string, SelectGroup>();
  for (const candidate of candidates) {
    const label = candidate.vendor.isOurs
      ? `${candidate.vendor.name} (ours)`
      : candidate.vendor.name;
    const group = byVendor.get(candidate.vendor.id) ?? { label, options: [] };
    const reason = candidate.trips[tripId]?.reasons[0];
    group.options.push({
      value: candidate.id,
      label: reason ? `${candidate.name} · ${reason}` : candidate.name,
      disabled: reason !== undefined,
    });
    byVendor.set(candidate.vendor.id, group);
  }
  return [
    { value: NOT_NOW, label: "Not now" },
    ...byVendor.values(),
    {
      label: "Let a vendor choose",
      options: vendors.map((vendor) => ({
        value: `vendor:${vendor.id}`,
        label: `${vendor.name} chooses the ${role}`,
      })),
    },
  ];
}
