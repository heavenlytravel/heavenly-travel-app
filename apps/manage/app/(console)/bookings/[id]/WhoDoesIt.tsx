"use client";

import {
  DECLINE_NOTE_MAX_LENGTH,
  DECLINE_REASONS,
  DECLINE_REASON_LABELS,
  formatLocalDateTime,
  formatMyr,
  isLive,
  modelName,
  PART_ROLE_LABELS,
  ringgitInputValue,
  type PartRole,
} from "@repo/db";
import type { Candidate, FulfilmentTrip, TripPartView } from "@repo/db/server";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { useState, useTransition, type ReactNode } from "react";
import { Card, CardTitle } from "../../../_components/Card";
import { FormError } from "../../../_components/FormError";
import { useActionForm } from "../../../_lib/use-action-form";
import { AssignButton } from "./AssignPanel";
import {
  answerPartsAction,
  loadAssignChoices,
  namePartsAction,
  releaseFulfilAction,
  setPartCostAction,
} from "./fulfil-actions";

/**
 * One role asked of one vendor across the booking's live trips: the parts
 * of one offer, acted on together.
 */
type PartGroup = {
  role: PartRole;
  parts: TripPartView[];
  positions: number[];
};

/** The live trips' parts by offer and role, vehicle first. */
function groupsOf(trips: readonly FulfilmentTrip[]): PartGroup[] {
  const groups = new Map<string, PartGroup>();
  for (const trip of trips) {
    for (const part of trip.parts) {
      const key = `${part.role}:${part.offerId}`;
      const group = groups.get(key) ?? {
        role: part.role as PartRole,
        parts: [],
        positions: [],
      };
      group.parts.push(part);
      group.positions.push(trip.position);
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.role === b.role ? 0 : a.role === "vehicle" ? -1 : 1,
  );
}

/** "VLE1234, Toyota Alphard, Black", "Ali bin Abu, +60…", or null when the vendor is to choose. */
function namedOf(part: TripPartView) {
  if (part.vehicle) {
    return `${part.vehicle.plate}, ${modelName(part.vehicle.vehicleModel)}, ${part.vehicle.colour}`;
  }
  if (part.driver) return `${part.driver.name}, ${part.driver.phone}`;
  return null;
}

/** Where a group stands: its vendor's answer, then a driver's own. */
function stateOf(group: PartGroup): { label: string; tone: "amber" | "green" } {
  const first = group.parts[0]!;
  if (group.parts.some((p) => !p.vendorAcceptedAt)) {
    return {
      label: `Waiting for ${first.offer.vendor.name}, by ${formatLocalDateTime(first.offer.respondBy)}`,
      tone: "amber",
    };
  }
  if (group.role === "driver" && group.parts.some((p) => !p.driverAcceptedAt)) {
    return {
      label: `Waiting for ${first.driver?.name ?? "the driver"}`,
      tone: "amber",
    };
  }
  return { label: "Accepted", tone: "green" };
}

const tripsName = (positions: readonly number[]) =>
  positions.length === 1
    ? `trip ${positions[0]}`
    : `trips ${positions.join(", ")}`;

/**
 * "Who does it" on a booking: each trip assigned or not, and each vehicle
 * and driver asked for, with its vendor, whom it names, what we owe and
 * whose answer it waits for. For Operation, the way to assign, to record
 * an answer given by phone, to name what a vendor chose and to release a
 * part; every other team reads it. See
 * docs/261028-fulfilment-vendors-and-connect.md.
 */
export function WhoDoesIt({
  bookingId,
  trips,
  canFulfil,
}: {
  bookingId: string;
  trips: FulfilmentTrip[];
  canFulfil: boolean;
}) {
  const live = trips.filter((t) => isLive(t) && t.status !== "completed");
  const groups = groupsOf(live);
  const toAsk = live.filter(
    (t) =>
      (t.status === "confirmed" || t.status === "assigned") &&
      (["vehicle", "driver"] as const).some(
        (role) => !t.parts.some((p) => p.role === role),
      ),
  );
  const owed = trips.filter(
    (t) =>
      t.status === "cancelled" &&
      t.parts.some((p) => !p.offer.vendor.isOurs && p.vendorAcceptedAt),
  );
  const received = live.some((t) => t.status === "received");
  if (live.length === 0 && owed.length === 0) return null;

  return (
    <Card className="grid gap-4">
      <CardTitle
        action={
          canFulfil && toAsk.length > 0 ? (
            <AssignButton bookingId={bookingId} trips={toAsk} />
          ) : null
        }
      >
        Who does it
      </CardTitle>
      {received ? (
        <p className="text-sm text-slate-500">
          A trip is assigned once it is confirmed.
        </p>
      ) : null}
      <ul className="grid gap-1 text-sm">
        {live.map((trip) => (
          <li key={trip.id} className="flex flex-wrap items-center gap-2">
            <span>
              Trip {trip.position}, {formatLocalDateTime(trip.startsAt)}
            </span>
            {trip.assigned ? (
              <Badge tone="green">Assigned</Badge>
            ) : trip.parts.length > 0 ? (
              <Badge tone="amber">Waiting to accept</Badge>
            ) : (
              <Badge>To assign</Badge>
            )}
          </li>
        ))}
      </ul>
      {groups.map((group) => (
        <GroupRow
          key={`${group.role}:${group.parts[0]!.offerId}`}
          bookingId={bookingId}
          group={group}
          canFulfil={canFulfil}
        />
      ))}
      {canFulfil && groups.length > 0 ? (
        <ReleaseAll bookingId={bookingId} />
      ) : null}
      {owed.map((trip) => (
        <div
          key={trip.id}
          className="grid gap-2 border-t border-slate-100 pt-3"
        >
          <p className="text-sm font-medium">
            Trip {trip.position}, cancelled: what we owe
          </p>
          {trip.parts
            .filter((p) => !p.offer.vendor.isOurs && p.vendorAcceptedAt)
            .map((part) => (
              <CostRow
                key={part.id}
                bookingId={bookingId}
                part={part}
                canFulfil={canFulfil}
              />
            ))}
        </div>
      ))}
    </Card>
  );
}

function GroupRow({
  bookingId,
  group,
  canFulfil,
}: {
  bookingId: string;
  group: PartGroup;
  canFulfil: boolean;
}) {
  const first = group.parts[0]!;
  const vendor = first.offer.vendor;
  const named = namedOf(first);
  const state = stateOf(group);
  const cost = group.parts.reduce((sum, p) => sum + p.costSen, 0);
  const partIds = group.parts.map((p) => p.id);
  const vendorWaits = group.parts.some((p) => !p.vendorAcceptedAt);
  const driverWaits =
    group.role === "driver" &&
    !vendorWaits &&
    group.parts.some((p) => !p.driverAcceptedAt);

  return (
    <div className="grid gap-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">
          {PART_ROLE_LABELS[group.role]}, {tripsName(group.positions)}
        </span>
        <span>{vendor.name}</span>
        {vendor.isOurs ? <Badge tone="blue">Ours</Badge> : null}
        <Badge tone={state.tone}>{state.label}</Badge>
      </div>
      <p className="text-sm text-slate-600">
        {named ?? "Vendor to choose"}
        {!vendor.isOurs ? ` · We owe ${formatMyr(cost)}` : null}
      </p>
      {canFulfil ? (
        <div className="flex flex-wrap items-start gap-2">
          {!named ? (
            <NameControl
              bookingId={bookingId}
              role={group.role}
              vendorId={vendor.id}
              partIds={partIds}
            />
          ) : null}
          {named && vendorWaits ? (
            <AnswerButton
              bookingId={bookingId}
              partIds={partIds}
              as="vendor"
              recorded={!vendor.isOurs}
              label={vendor.isOurs ? "Accept" : "Record acceptance"}
              done={
                vendor.isOurs
                  ? "Accepted for us."
                  : `Recorded ${vendor.name}'s acceptance.`
              }
            />
          ) : null}
          {named && driverWaits ? (
            <AnswerButton
              bookingId={bookingId}
              partIds={partIds}
              as="driver"
              recorded
              label="Record driver's acceptance"
              done="Recorded the driver's acceptance."
            />
          ) : null}
          {vendorWaits && !vendor.isOurs ? (
            <DeclineControl
              bookingId={bookingId}
              partIds={partIds}
              as="vendor"
            />
          ) : null}
          {driverWaits ? (
            <DeclineControl
              bookingId={bookingId}
              partIds={partIds}
              as="driver"
            />
          ) : null}
          <ReleaseButton
            bookingId={bookingId}
            partIds={partIds}
            what={`the ${group.role} of ${tripsName(group.positions)}`}
          />
        </div>
      ) : null}
    </div>
  );
}

/** A yes for the vendor or the driver: Operation's own for ours, recorded for anyone else. */
function AnswerButton({
  bookingId,
  partIds,
  as,
  recorded,
  label,
  done,
}: {
  bookingId: string;
  partIds: string[];
  as: "vendor" | "driver";
  recorded: boolean;
  label: string;
  done: string;
}) {
  const { pending, error, formProps } = useActionForm(answerPartsAction, {
    done,
  });
  return (
    <form {...formProps} className="grid gap-1">
      <PartFields bookingId={bookingId} partIds={partIds} />
      <input type="hidden" name="as" value={as} />
      <input type="hidden" name="accept" value="true" />
      <input type="hidden" name="recorded" value={String(recorded)} />
      <Button type="submit" size="sm" disabled={pending}>
        {label}
      </Button>
      <FormError error={error} size="xs" />
    </form>
  );
}

/** A no, given by phone, with why: the part reopens. */
function DeclineControl({
  bookingId,
  partIds,
  as,
}: {
  bookingId: string;
  partIds: string[];
  as: "vendor" | "driver";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, error, formProps } = useActionForm(answerPartsAction, {
    done: "Recorded the decline. The part is open again.",
    onDone: () => setOpen(false),
  });
  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Record decline
      </Button>
    );
  }
  return (
    <form
      {...formProps}
      className="grid w-full gap-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <PartFields bookingId={bookingId} partIds={partIds} />
      <input type="hidden" name="as" value={as} />
      <input type="hidden" name="accept" value="false" />
      <input type="hidden" name="recorded" value="true" />
      <Field label="Why">
        <Select
          name="reason"
          required
          value={reason}
          onValueChange={setReason}
          options={DECLINE_REASONS.map((value) => ({
            value,
            label: DECLINE_REASON_LABELS[value],
          }))}
        />
      </Field>
      {reason === "other" ? (
        <Field label="In a few words">
          <Input name="note" required maxLength={DECLINE_NOTE_MAX_LENGTH} />
        </Field>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="caution" disabled={pending}>
          Record decline
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <FormError error={error} size="xs" />
    </form>
  );
}

/** The vehicle or driver a vendor chose, picked from its own in the picker. */
function NameControl({
  bookingId,
  role,
  vendorId,
  partIds,
}: {
  bookingId: string;
  role: PartRole;
  vendorId: string;
  partIds: string[];
}) {
  const [options, setOptions] = useState<Candidate[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);
  const { pending, error, formProps } = useActionForm(namePartsAction, {
    done: `${PART_ROLE_LABELS[role]} named. Its vendor still accepts.`,
    onDone: () => setOptions(null),
  });

  function open() {
    startLoading(async () => {
      const choices = await loadAssignChoices(bookingId);
      if (!choices) {
        setLoadError("Your teams cannot assign. Ask a SUPER admin.");
        return;
      }
      const all = role === "vehicle" ? choices.vehicles : choices.drivers;
      setOptions(all.filter((c) => c.vendor.id === vendorId));
    });
  }

  if (!options) {
    return (
      <div className="grid gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={open}
        >
          Name {role}
        </Button>
        <FormError error={loadError} size="xs" />
      </div>
    );
  }
  return (
    <form
      {...formProps}
      className="grid w-full gap-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <PartFields bookingId={bookingId} partIds={partIds} />
      <Field label={`The ${role} the vendor chose`}>
        <Select
          name="recordId"
          required
          options={options.map((c) => ({
            value: c.id,
            label: c.reasons.length > 0 ? `${c.name}: ${c.reasons[0]}` : c.name,
            disabled: c.reasons.length > 0,
          }))}
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Name {role}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOptions(null)}
        >
          Cancel
        </Button>
      </div>
      <FormError error={error} size="xs" />
    </form>
  );
}

function ReleaseButton({
  bookingId,
  partIds,
  what,
}: {
  bookingId: string;
  partIds: string[];
  what: string;
}) {
  const [dialog, confirm] = useConfirm();
  const { pending, error, formProps } = useActionForm(releaseFulfilAction, {
    ask: () =>
      confirm({
        title: `Release ${what}?`,
        description: "Its trips go back to To assign for this part.",
        action: "Release",
      }),
    done: "Released.",
  });
  return (
    <form {...formProps} className="grid gap-1">
      <PartFields bookingId={bookingId} partIds={partIds} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        Release
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}

/** Lets every vehicle and driver of the booking go, to start again. */
function ReleaseAll({ bookingId }: { bookingId: string }) {
  const [dialog, confirm] = useConfirm();
  const { pending, error, formProps } = useActionForm(releaseFulfilAction, {
    ask: () =>
      confirm({
        title: "Release everything?",
        description:
          "Every vehicle and driver asked for or accepted on this booking is let go, and its trips go back to To assign.",
        action: "Release all",
        danger: true,
      }),
    done: "Released. The trips are to assign again.",
  });
  return (
    <form {...formProps} className="grid justify-items-start gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Release all
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}

/** What we owe a vendor for a part of a cancelled trip, and the way to change it. */
function CostRow({
  bookingId,
  part,
  canFulfil,
}: {
  bookingId: string;
  part: TripPartView;
  canFulfil: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(setPartCostAction, {
    done: "Cost saved.",
    onDone: () => setOpen(false),
  });
  const line: ReactNode = (
    <span>
      {PART_ROLE_LABELS[part.role as PartRole]}, {part.offer.vendor.name}:{" "}
      {formatMyr(part.costSen)}
    </span>
  );
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {line}
        {canFulfil ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(true)}
          >
            Change cost
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <form
      {...formProps}
      className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      {line}
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="partId" value={part.id} />
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Amount (RM)">
          <Input
            name="costSen"
            inputMode="decimal"
            required
            defaultValue={ringgitInputValue(part.costSen)}
          />
        </Field>
        <Field label="Reason">
          <Input name="reason" required maxLength={200} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <FormError error={error} size="xs" />
    </form>
  );
}

function PartFields({
  bookingId,
  partIds,
}: {
  bookingId: string;
  partIds: string[];
}) {
  return (
    <>
      <input type="hidden" name="bookingId" value={bookingId} />
      {partIds.map((id) => (
        <input key={id} type="hidden" name="partId" value={id} />
      ))}
    </>
  );
}
