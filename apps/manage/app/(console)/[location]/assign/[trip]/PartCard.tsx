"use client";

import {
  DECLINE_NOTE_MAX_LENGTH,
  DECLINE_REASONS,
  DECLINE_REASON_LABELS,
  formatLocalDateTime,
  formatMyr,
  modelName,
  PART_ROLE_LABELS,
  partWaitingLabel,
  partWaitingOf,
  type PartRole,
} from "@repo/db";
import type { Candidate, TripPartView } from "@repo/db/server";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { Rows } from "@repo/ui/rows";
import { Select } from "@repo/ui/select";
import { useState, type ReactNode } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { useActionForm } from "@repo/console/use-action-form";
import {
  answerPartsAction,
  namePartsAction,
  releaseFulfilAction,
} from "../actions";

/** "VLE1234 · Toyota Alphard · Black", "Ali bin Abu · +60…", or null while not named. */
function namedOf(part: TripPartView) {
  if (part.vehicle) {
    return `${part.vehicle.plate} · ${modelName(part.vehicle.vehicleModel)} · ${part.vehicle.colour}`;
  }
  if (part.driver) return `${part.driver.name} · ${part.driver.phone}`;
  return null;
}

/**
 * One role of a trip already asked for: its vendor, whom it names, what
 * we pay, whose answer it waits for and by when, and what Operation can
 * do next. Accepting, declining and naming act on the same ask across
 * the booking's trips (`partIds`, `positions`), as the vendor answers it
 * once; Withdraw, before the vendor's yes, and Release, after it, let
 * this trip's part go alone, to ask again.
 */
export function PartCard({
  bookingId,
  role,
  part,
  partIds,
  positions,
  candidates,
}: {
  bookingId: string;
  role: PartRole;
  part: TripPartView;
  /** This part and its siblings: the same ask on the booking's other live trips. */
  partIds: string[];
  /** The trips they are on, this one included. */
  positions: number[];
  /** The vendor's own vehicles or drivers, to name the one it chose. */
  candidates: Candidate[];
}) {
  const vendor = part.offer.vendor;
  const named = namedOf(part);
  const waiting = partWaitingOf(part, vendor.isOurs);
  const vendorWaits = waiting === "vendor" || waiting === "ours";
  const others = positions.length > 1 ? `trips ${positions.join(", ")}` : null;

  const rows: [string, ReactNode][] = [
    [
      "Vendor",
      <span key="v" className="flex flex-wrap items-center gap-2">
        {vendor.name}
        {vendor.isOurs ? <Badge tone="brand">Ours</Badge> : null}
      </span>,
    ],
    [
      PART_ROLE_LABELS[role],
      named ?? (
        <span key="n" className="font-normal text-muted">
          {vendor.isOurs
            ? "Any: not named yet"
            : `Any: ${vendor.name} will assign it`}
        </span>
      ),
    ],
  ];
  if (!vendor.isOurs) rows.push(["Pay vendor", formatMyr(part.costSen)]);
  if (vendorWaits) {
    rows.push(["Answer by", formatLocalDateTime(part.offer.respondBy)]);
  }
  if (others) rows.push(["Same ask on", others]);

  return (
    <Card>
      <CardTitle
        action={
          <Badge dot tone={waiting ? "amber" : "green"}>
            {waiting ? partWaitingLabel(waiting, vendor.name) : "Accepted"}
          </Badge>
        }
      >
        {PART_ROLE_LABELS[role]}
      </CardTitle>
      <Rows rows={rows} className="text-sm" />
      <div className="mt-4 flex flex-wrap items-start gap-2">
        {!named ? (
          <NameControl
            bookingId={bookingId}
            role={role}
            partIds={partIds}
            candidates={candidates}
            onWhat={others}
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
        {waiting === "driver" ? (
          <AnswerButton
            bookingId={bookingId}
            partIds={partIds}
            as="driver"
            recorded
            label="Record driver's acceptance"
            done="Recorded the driver's acceptance."
          />
        ) : null}
        {waiting === "vendor" ? (
          <DeclineControl bookingId={bookingId} partIds={partIds} as="vendor" />
        ) : null}
        {waiting === "driver" ? (
          <DeclineControl bookingId={bookingId} partIds={partIds} as="driver" />
        ) : null}
        <ReleaseButton
          bookingId={bookingId}
          partId={part.id}
          role={role}
          withdraw={vendorWaits}
          vendorName={vendor.name}
        />
      </div>
    </Card>
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
      <Button type="submit" size="sm" pending={pending}>
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
    done: "Recorded the decline. The trip is to assign again.",
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
      className="grid w-full gap-2 rounded-control border border-card-edge bg-shade p-3"
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
        <Button type="submit" size="sm" variant="caution" pending={pending}>
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

/** The vehicle or driver the vendor chose, picked from its own. */
function NameControl({
  bookingId,
  role,
  partIds,
  candidates,
  onWhat,
}: {
  bookingId: string;
  role: PartRole;
  partIds: string[];
  candidates: Candidate[];
  /** "trips 1, 2" when it names the same on several trips. */
  onWhat: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(namePartsAction, {
    done: `${PART_ROLE_LABELS[role]} named.`,
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
        Name {role}
      </Button>
    );
  }
  return (
    <form
      {...formProps}
      className="grid w-full gap-2 rounded-control border border-card-edge bg-shade p-3"
    >
      <PartFields bookingId={bookingId} partIds={partIds} />
      <Field
        label={`The ${role}${onWhat ? ` for ${onWhat}` : ""}`}
        hint={
          candidates.length === 0
            ? `This vendor has no ${role} for this class.`
            : undefined
        }
      >
        <Select
          name="recordId"
          required
          options={candidates.map((c) => ({
            value: c.id,
            label:
              c.reasons.length > 0 ? `${c.name} · ${c.reasons[0]}` : c.name,
            disabled: c.reasons.length > 0,
          }))}
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" pending={pending}>
          Name {role}
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

/** Undo: lets this trip's part go, before its vendor's yes (Withdraw) or after (Release). */
function ReleaseButton({
  bookingId,
  partId,
  role,
  withdraw,
  vendorName,
}: {
  bookingId: string;
  partId: string;
  role: PartRole;
  withdraw: boolean;
  vendorName: string;
}) {
  const [dialog, confirm] = useConfirm();
  const verb = withdraw ? "Withdraw" : "Release";
  const { pending, error, formProps } = useActionForm(releaseFulfilAction, {
    ask: () =>
      confirm({
        title: withdraw
          ? `Withdraw the ${role} asked of ${vendorName}?`
          : `Release the ${role}?`,
        description: `This trip's ${role} goes back to To assign, to ask again.`,
        action: verb,
      }),
    done: withdraw
      ? "Withdrawn. Assign it again."
      : "Released. Assign it again.",
  });
  return (
    <form {...formProps} className="grid gap-1">
      <PartFields bookingId={bookingId} partIds={[partId]} />
      <Button type="submit" size="sm" variant="ghost" pending={pending}>
        {verb}
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
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
