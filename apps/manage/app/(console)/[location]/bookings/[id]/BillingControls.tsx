"use client";

import { LEGACY_INVOICE_MAX, localDayOf } from "@repo/db";
import { Field, Input } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { ActionDialog } from "../../../../_components/ActionDialog";
import { LEGACY_INVOICE_FIELD } from "../_lib/trip-form";
import {
  setBookingAgentAction,
  setLegacyAction,
  setPayLaterAction,
} from "./actions";

/**
 * The booking's old invoice number, the old system's, set or cleared: a
 * note for the team, apart from the booking's notes. It bills nothing.
 */
export function OldInvoiceNumberControl({
  bookingId,
  value,
}: {
  bookingId: string;
  value: string | null;
}) {
  return (
    <ActionDialog
      action={setLegacyAction}
      label={value ? "Change" : "Add"}
      title="Old Invoice Number"
      description="The old system's invoice number, for the team's reference. It bills nothing: the booking is billed here."
      done="Old invoice number saved."
      submit="Save"
      hidden={{ bookingId }}
      variant="ghost"
    >
      <Field
        label="Old Invoice Number"
        hint="As it was written: HT1223, HTI-1295-03. Empty to remove it."
      >
        <Input
          name={LEGACY_INVOICE_FIELD}
          maxLength={LEGACY_INVOICE_MAX}
          autoComplete="off"
          defaultValue={value ?? ""}
        />
      </Field>
    </ActionDialog>
  );
}

/**
 * The agent the booking came through, corrected, or none. What is billed
 * already keeps who it was billed to: Finance voids and reissues it.
 */
export function BookingAgentControl({
  bookingId,
  agentId,
  agents,
}: {
  bookingId: string;
  agentId: string | null;
  agents: readonly { id: string; name: string }[];
}) {
  const [chosen, setChosen] = useState(agentId ?? "");
  return (
    <ActionDialog
      action={setBookingAgentAction}
      label="Change"
      title="Agent"
      description="Who the booking came through, and is billed to from now on. An invoice issued already keeps its billed-to: Finance voids and reissues it."
      done="Agent saved."
      submit="Save"
      hidden={{ bookingId, agentId: chosen }}
      variant="ghost"
    >
      <Field label="Agent">
        <Select
          value={chosen}
          onValueChange={setChosen}
          options={[
            { value: "", label: "None: Our Own Customer" },
            ...agents.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      </Field>
    </ActionDialog>
  );
}

/**
 * Pay later on a booking nothing is paid for yet: agreed, by the day it is
 * due (for reference, it marks nothing overdue). Set again to change the
 * day; `dueOn` given, "Back to Pending" undoes it. The first payment
 * ends it.
 */
export function PayLaterControl({
  bookingId,
  dueOn,
}: {
  bookingId: string;
  /** "2026-11-30" while set. */
  dueOn: string | null;
}) {
  return (
    <span className="flex flex-wrap gap-2">
      <ActionDialog
        action={setPayLaterAction}
        label={dueOn ? "Change Day" : "Pay Later"}
        title="Pay Later"
        description="Agreed that it is paid later, so it reads Pay later, not Pending. The day is for reference: nothing is blocked or marked overdue. The first payment recorded ends it."
        done="Set to Pay later."
        submit="Save"
        hidden={{ bookingId }}
        variant={dueOn ? "ghost" : "secondary"}
      >
        <Field label="To Be Paid By">
          <Input
            name="dueOn"
            type="date"
            required
            defaultValue={dueOn ?? localDayOf(new Date())}
          />
        </Field>
      </ActionDialog>
      {dueOn ? (
        <ActionDialog
          action={setPayLaterAction}
          label="Back to Pending"
          title="Back to Pending?"
          description="It reads Pending again: no payment yet, and none agreed for later."
          done="Back to Pending."
          submit="Back to Pending"
          hidden={{ bookingId, clear: "true" }}
          variant="ghost"
        >
          <p className="text-sm text-muted">Nothing else changes.</p>
        </ActionDialog>
      ) : null}
    </span>
  );
}
