"use client";

import { LEGACY_INVOICE_MAX } from "@repo/db";
import { Field, Input } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { ActionDialog } from "../../../../_components/ActionDialog";
import { LEGACY_INVOICE_FIELD } from "../_lib/trip-form";
import { setBookingAgentAction, setLegacyAction } from "./actions";

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
      title="Old invoice number"
      description="The old system's invoice number, for the team's reference. It bills nothing: the booking is billed here."
      done="Old invoice number saved."
      submit="Save"
      hidden={{ bookingId }}
      variant="ghost"
    >
      <Field
        label="Old invoice number"
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
            { value: "", label: "None: our own customer" },
            ...agents.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
      </Field>
    </ActionDialog>
  );
}
