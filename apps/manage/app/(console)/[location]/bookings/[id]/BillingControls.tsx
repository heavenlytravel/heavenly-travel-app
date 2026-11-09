"use client";

import { LEGACY_INVOICE_MAX } from "@repo/db";
import { Field, Input } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { ActionDialog } from "../../../../_components/ActionDialog";
import { LEGACY_INVOICE_FIELD } from "../_lib/trip-form";
import { setBookingAgentAction, setLegacyAction } from "./actions";

/**
 * The booking's legacy invoice number, the old system's, set or cleared.
 * With one it is billed outside the system; cleared, a confirmed booking
 * is billed here at once, which the dialog says.
 */
export function LegacyInvoiceControl({
  bookingId,
  value,
  billedHere,
}: {
  bookingId: string;
  value: string | null;
  /** It has invoices here: a legacy number cannot be given. */
  billedHere: boolean;
}) {
  if (billedHere && value === null) return null;
  return (
    <ActionDialog
      action={setLegacyAction}
      label={value ? "Change" : "Billed outside"}
      title="Legacy invoice number"
      description={
        value
          ? "The old system's invoice it was billed on. Empty the box to bill it here instead: a confirmed booking is billed at once."
          : "When the old system billed this booking already. With one, the app bills it nothing, and its changes are billed in Finance's sheet."
      }
      done="Legacy invoice number saved."
      submit="Save"
      hidden={{ bookingId }}
      variant="ghost"
    >
      <Field
        label="Legacy invoice number"
        hint="As it was written: HT1223, HTI-1295-03."
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
