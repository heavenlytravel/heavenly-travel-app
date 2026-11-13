"use client";

import {
  BILLING_REASON_MAX,
  type BusinessProfile,
  type PaymentTerms,
} from "@repo/db";
import { useActionForm } from "@repo/console/use-action-form";
import { FORM_WIDTH } from "@repo/console/PageColumn";
import { Card, CardTitle } from "@repo/console/Card";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Field, Textarea } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { useState } from "react";
import { ActionDialog } from "../../../../_components/ActionDialog";
import {
  addAgentAction,
  changeTermsAction,
  setAgentStatusAction,
  updateAgentAction,
} from "../actions";
import { AgentProfileFields, PaymentTermsFields } from "./AgentFields";

/** Add agent: who it is, who the team speaks to, how it pays. Opens the agent's page once added. */
export function AddAgentForm() {
  const { pending, error, formProps, leaveDialog } = useActionForm(
    addAgentAction,
    { done: "Agent added.", leave: "The agent is not added." },
  );
  return (
    <form {...formProps} className={`grid gap-5 ${FORM_WIDTH}`}>
      <Card>
        <CardTitle>Details</CardTitle>
        <AgentProfileFields profile={null} />
      </Card>
      <Card>
        <CardTitle>Billing</CardTitle>
        <PaymentTermsFields terms="none" daysToPay={30} />
      </Card>
      <FormError error={error} />
      <div>
        <Button type="submit" pending={pending}>
          {pending ? "Adding…" : "Add Agent"}
        </Button>
      </div>
      {leaveDialog}
    </form>
  );
}

/** "Edit" on the agent's details: its profile corrected in place; it closes once saved. */
export function EditAgentControl({
  id,
  profile,
}: {
  id: string;
  profile: BusinessProfile;
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(updateAgentAction, {
    done: "Agent saved.",
    onDone: () => setOpen(false),
  });
  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Edit
      </Button>
    );
  }
  return (
    <form {...formProps} className="grid w-full gap-4">
      <input type="hidden" name="id" value={id} />
      <AgentProfileFields profile={profile} />
      <FormError error={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" pending={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Finance's "Change Terms": the new terms and days to pay, going forward, with why. */
export function ChangeTermsControl({
  id,
  terms,
  daysToPay,
}: {
  id: string;
  terms: PaymentTerms;
  daysToPay: number;
}) {
  return (
    <ActionDialog
      action={changeTermsAction}
      label="Change Terms"
      title="Change Payment Terms"
      description="From now on: what is billed already stays as it is. What is not billed yet is billed by the new terms."
      done="Payment terms changed."
      submit="Change Terms"
      hidden={{ id }}
      width="md"
    >
      <PaymentTermsFields terms={terms} daysToPay={daysToPay} />
      <Field label="Reason" hint="Kept in the agent's history.">
        <Textarea
          name="reason"
          rows={2}
          required
          maxLength={BILLING_REASON_MAX}
        />
      </Field>
    </ActionDialog>
  );
}

/** Makes the agent inactive, or active again; inactive takes no new bookings, and is still billed. */
export function AgentStatusControl({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const [dialog, confirm] = useConfirm();
  const { pending, error, formProps } = useActionForm(setAgentStatusAction, {
    ask: active
      ? () =>
          confirm({
            title: `Make ${name} inactive?`,
            description:
              "It takes no new bookings. Its bookings stay, and are still billed.",
            action: "Make Inactive",
          })
      : undefined,
    done: active ? `${name} is inactive.` : `${name} is active again.`,
  });
  return (
    <form {...formProps} className="grid gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input
        type="hidden"
        name="status"
        value={active ? "inactive" : "active"}
      />
      <Button type="submit" variant="secondary" pending={pending}>
        {active ? "Make Inactive" : "Make Active"}
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}
