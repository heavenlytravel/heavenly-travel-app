"use client";

import { VENDOR_FIELD_LABELS } from "@repo/db";
import {
  InvoicePeriodField,
  VendorDetailsFields,
  VendorLocationChecks,
} from "@repo/console/VendorFieldsSection";
import { answerOf, UNANSWERED_MESSAGE } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { Field } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { PlusIcon } from "@repo/ui/icons";
import { Select } from "@repo/ui/select";
import { toast } from "@repo/ui/toast";
import { Tooltip } from "@repo/ui/tooltip";
import { showFieldError } from "@repo/ui/validation";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { addAgentAction } from "../new/actions";

/** An agent a booking may come through. */
export type Agent = { id: string; name: string };

/**
 * The agent the booking came through, if any: its invoice is the agent's.
 * One not yet entered is added here, beside the list, through a dialog
 * that asks for an agent alone, not any other vendor, and is chosen at
 * once. The rest of a vendor, its bank, is entered later on its page.
 */
export function AgentPicker({
  agents,
  value,
  onChange,
  onAdded,
  locations,
  locationId,
}: {
  agents: readonly Agent[];
  /** The agent chosen, by id; "" for none. */
  value: string;
  onChange: (agentId: string) => void;
  /** An agent added here, for the list until the page's own brings it. */
  onAdded: (agent: Agent) => void;
  /** The locations an agent may serve. */
  locations: readonly { id: string; name: string }[];
  /** The location the form is open in, ticked for a new agent; null under every location. */
  locationId: string | null;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <Field
      label="Agent"
      hint="Choose the agent when the booking came through one. The customer below is the agent's guest."
      className="mb-4"
    >
      <div className="flex items-center gap-2">
        <Select
          className="min-w-0 flex-1"
          value={value}
          onValueChange={onChange}
          options={[
            { value: "", label: "None: our own customer" },
            ...agents.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <Tooltip content="Add an agent">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shrink-0"
            aria-label="Add an agent"
            onClick={() => setAdding(true)}
          >
            <PlusIcon />
          </Button>
        </Tooltip>
      </div>
      {/* On the body: the booking is a form, and a form in a form is not allowed. */}
      {adding
        ? createPortal(
            <AddAgentDialog
              locations={locations}
              locationId={locationId}
              onClose={() => setAdding(false)}
              onAdded={(agent) => {
                onAdded(agent);
                onChange(agent.id);
                setAdding(false);
              }}
            />,
            document.body,
          )
        : null}
    </Field>
  );
}

/** The dialog that adds an agent: who it is, who the team speaks to, how it is invoiced, where it works. */
function AddAgentDialog({
  locations,
  locationId,
  onClose,
  onAdded,
}: {
  locations: readonly { id: string; name: string }[];
  locationId: string | null;
  onClose: () => void;
  onAdded: (agent: Agent) => void;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Through the portal, React would carry the submit on to the booking's form.
    event.stopPropagation();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const answer = await answerOf(addAgentAction(formData));
      if (!answer || "error" in answer) {
        const message = answer?.error ?? UNANSWERED_MESSAGE;
        const atField =
          answer && "field" in answer && answer.field
            ? showFieldError(form.current, answer.field, message)
            : false;
        setError(atField ? null : message);
        return;
      }
      toast.success(`Agent ${answer.name} added.`);
      router.refresh();
      onAdded(answer);
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title="Add an agent"
      description="An agent the booking comes through, chosen for it once added. Its bank and the rest are entered later on its page under Vendors."
      width="md"
    >
      <form
        ref={form}
        onSubmit={submit}
        onInput={() => setError(null)}
        className="grid gap-5"
      >
        <VendorDetailsFields fields={null} />
        <InvoicePeriodField value="month" />
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold text-ink">
            {VENDOR_FIELD_LABELS.locationIds}
          </legend>
          <VendorLocationChecks
            locations={locations}
            served={new Set(locationId ? [locationId] : [])}
          />
        </fieldset>
        <FormError error={error} />
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" pending={pending}>
            {pending ? "Adding…" : "Add agent"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
