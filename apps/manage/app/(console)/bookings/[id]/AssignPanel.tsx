"use client";

import {
  defaultRespondBy,
  formatLocalDateTime,
  localDateTimeInputs,
  PART_ROLE_LABELS,
  type PartRole,
} from "@repo/db";
import type { Candidate, FulfilmentTrip } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Checkbox, Field, Input } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { useState, useTransition } from "react";
import { FormError } from "../../../_components/FormError";
import { useActionForm } from "../../../_lib/use-action-form";
import {
  assignAction,
  loadAssignChoices,
  type AssignChoices,
} from "./fulfil-actions";

/** A role's choice: left out, a vehicle or driver named, or a vendor asked to choose. */
type Choice =
  | { kind: "none" }
  | { kind: "named"; candidate: Candidate }
  | { kind: "ask"; vendorId: string };

/**
 * "Assign" on a booking: the vehicle and the driver for its trips still to
 * assign, each named from the picker, ours first, or left to a vendor to
 * choose; either may wait. A vehicle or driver that cannot do the trips is
 * greyed with why; the timing warnings only warn. A vendor not ours is
 * offered an amount per trip for each part, and answers by a time. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Assigning a booking".
 */
export function AssignButton({
  bookingId,
  trips,
}: {
  bookingId: string;
  /** The live, confirmed trips with a role still to ask for. */
  trips: FulfilmentTrip[];
}) {
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<AssignChoices | null>(null);
  const [loading, startLoading] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openPanel() {
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
    <div className="grid justify-items-end gap-1">
      <Button size="sm" onClick={openPanel} disabled={loading}>
        {loading ? "Opening…" : "Assign"}
      </Button>
      <FormError error={error} size="xs" />
      {choices ? (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Assign"
          description="One vehicle and one driver for the booking's trips. Each one's owner accepts before the trip is assigned."
          width="lg"
        >
          <AssignForm
            bookingId={bookingId}
            trips={trips}
            choices={choices}
            onDone={() => setOpen(false)}
          />
        </Dialog>
      ) : null}
    </div>
  );
}

function AssignForm({
  bookingId,
  trips,
  choices,
  onDone,
}: {
  bookingId: string;
  trips: FulfilmentTrip[];
  choices: AssignChoices;
  onDone: () => void;
}) {
  const needs = (role: PartRole) =>
    trips.filter((t) => !t.parts.some((p) => p.role === role));
  const [vehicle, setVehicle] = useState<Choice>({ kind: "none" });
  const [driver, setDriver] = useState<Choice>({ kind: "none" });
  const { pending, error, formProps } = useActionForm(assignAction, {
    done: "Sent. The trips are assigned once each one accepts.",
    onDone,
  });
  const respondBy = localDateTimeInputs(
    defaultRespondBy(trips[0]?.startsAt ?? new Date()),
  );
  const vendorOf = (choice: Choice) =>
    choice.kind === "named"
      ? choice.candidate.vendor
      : choice.kind === "ask"
        ? choices.vendors.find((v) => v.id === choice.vendorId)
        : undefined;
  const ourVehicle = vendorOf(vehicle)?.isOurs === true;

  return (
    <form {...formProps} className="grid gap-5">
      <input type="hidden" name="bookingId" value={bookingId} />
      {trips.map((trip) => (
        <input key={trip.id} type="hidden" name="itemId" value={trip.id} />
      ))}
      <RolePicker
        role="vehicle"
        trips={needs("vehicle")}
        candidates={choices.vehicles}
        vendors={choices.vendors}
        choice={vehicle}
        onChoice={setVehicle}
      />
      <RolePicker
        role="driver"
        trips={needs("driver")}
        candidates={choices.drivers}
        vendors={choices.vendors}
        choice={driver}
        onChoice={setDriver}
      />
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
        {ourVehicle && vehicle.kind === "named" ? (
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox name="acceptOurs" />I checked our vehicle: accept it now
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            pending || (vehicle.kind === "none" && driver.kind === "none")
          }
        >
          {pending ? "Sending…" : "Send"}
        </Button>
        <FormError error={error} />
      </div>
    </form>
  );
}

/** One role: the picker's list, or "Ask a vendor to choose", and the amounts for a vendor not ours. */
function RolePicker({
  role,
  trips,
  candidates,
  vendors,
  choice,
  onChoice,
}: {
  role: PartRole;
  /** The trips without this role yet; none hides the role. */
  trips: FulfilmentTrip[];
  candidates: Candidate[];
  vendors: AssignChoices["vendors"];
  choice: Choice;
  onChoice: (choice: Choice) => void;
}) {
  const [same, setSame] = useState(true);
  const [amount, setAmount] = useState("");
  const label = PART_ROLE_LABELS[role];
  if (trips.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Every trip has its {role} asked for already.
      </p>
    );
  }
  const vendor =
    choice.kind === "named"
      ? choice.candidate.vendor
      : choice.kind === "ask"
        ? vendors.find((v) => v.id === choice.vendorId)
        : undefined;
  const posted =
    choice.kind === "named"
      ? choice.candidate.id
      : choice.kind === "ask"
        ? `vendor:${choice.vendorId}`
        : "";

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-slate-800">
        {label}
      </legend>
      <input type="hidden" name={role} value={posted} />
      {choice.kind === "named" ? (
        <input
          type="hidden"
          name={`${role}Vendor`}
          value={choice.candidate.vendor.id}
        />
      ) : null}
      <div className="flex flex-wrap gap-2 text-sm">
        <Button
          type="button"
          size="sm"
          variant={choice.kind === "none" ? "primary" : "secondary"}
          onClick={() => onChoice({ kind: "none" })}
        >
          Not now
        </Button>
        <Button
          type="button"
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
      <ul
        className="grid max-h-72 gap-1 overflow-y-auto rounded-md border border-slate-200 p-1"
        data-field={role}
      >
        {candidates.length === 0 ? (
          <li className="p-2 text-sm text-slate-500">No {role} in service.</li>
        ) : (
          candidates.map((candidate) => {
            const usable = candidate.reasons.length === 0;
            const chosen =
              choice.kind === "named" && choice.candidate.id === candidate.id;
            return (
              <li key={candidate.id}>
                <label
                  className={`flex gap-2 rounded-md p-2 text-sm ${chosen ? "bg-slate-100" : ""} ${usable ? "cursor-pointer hover:bg-slate-50" : "text-slate-400"}`}
                >
                  <input
                    type="radio"
                    name={`${role}Pick`}
                    className="mt-1"
                    disabled={!usable}
                    checked={chosen}
                    onChange={() => onChoice({ kind: "named", candidate })}
                  />
                  <span className="grid gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{candidate.name}</span>
                      {candidate.vendor.isOurs ? (
                        <Badge tone="blue">Ours</Badge>
                      ) : (
                        <span className="text-xs">{candidate.vendor.name}</span>
                      )}
                      <span className="text-xs text-slate-500">
                        {candidate.locationName}
                      </span>
                    </span>
                    {candidate.reasons.map((reason) => (
                      <span key={reason} className="text-xs">
                        {reason}
                      </span>
                    ))}
                    {candidate.warnings.map((warning) => (
                      <span key={warning} className="text-xs text-amber-700">
                        {warning}
                      </span>
                    ))}
                    {candidate.day.map((line) => (
                      <span key={line} className="text-xs text-slate-500">
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
      {vendor && !vendor.isOurs ? (
        <div className="grid gap-2" data-field={`${role}Cost`}>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={same}
              onChange={(event) => setSame(event.target.checked)}
            />
            Same for every trip
          </label>
          {same ? (
            <Field label={`What we owe ${vendor.name} per trip (RM)`}>
              <Input
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          ) : null}
          {trips.map((trip) =>
            same ? (
              <input
                key={trip.id}
                type="hidden"
                name={`${role}Cost:${trip.id}`}
                value={amount}
              />
            ) : (
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
            ),
          )}
        </div>
      ) : null}
    </fieldset>
  );
}
