"use client";

import { isCredit, isPaymentTerms, PAYMENT_TERMS_LABELS } from "@repo/db";
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
import { addAgentForBookingAction } from "../../agents/actions";
import {
  AgentProfileFields,
  PaymentTermsFields,
} from "../../agents/_components/AgentFields";

/** An agent a booking may come through, and its `PaymentTerms`. */
export type Agent = { id: string; name: string; paymentTerms: string };

/** "Monthly Credit", "Twice a Month Credit" or "No Credit": how an agent pays, beside its name. */
export function agentTermsLabel(agent: Agent): string {
  if (!isPaymentTerms(agent.paymentTerms)) return "";
  return isCredit(agent.paymentTerms)
    ? `${PAYMENT_TERMS_LABELS[agent.paymentTerms]} Credit`
    : PAYMENT_TERMS_LABELS.none;
}

/**
 * The agent the booking came through, if any, each with its terms, credit
 * (monthly or twice a month) or none: it is billed to the agent by them. One not yet entered is added here, beside the
 * list, through the dialog Add agent's page asks the same in, and is
 * chosen at once.
 */
export function AgentPicker({
  agents,
  value,
  onChange,
  onAdded,
}: {
  agents: readonly Agent[];
  /** The agent chosen, by id; "" for none. */
  value: string;
  onChange: (agentId: string) => void;
  /** An agent added here, for the list until the page's own brings it. */
  onAdded: (agent: Agent) => void;
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
            { value: "", label: "None: Our Own Customer" },
            ...agents.map((a) => ({
              value: a.id,
              label: [a.name, agentTermsLabel(a)].filter(Boolean).join(" · "),
            })),
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

/** The dialog that adds an agent: who it is, who the team speaks to, how it pays. */
function AddAgentDialog({
  onClose,
  onAdded,
}: {
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
      const answer = await answerOf(addAgentForBookingAction(formData));
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
      title="Add an Agent"
      description="An agent the booking comes through, chosen for it once added. The rest is on its page under Agents."
      width="md"
    >
      <form
        ref={form}
        onSubmit={submit}
        onInput={() => setError(null)}
        className="grid gap-5"
      >
        <AgentProfileFields profile={null} />
        <PaymentTermsFields terms="none" daysToPay={30} />
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
            {pending ? "Adding…" : "Add Agent"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
