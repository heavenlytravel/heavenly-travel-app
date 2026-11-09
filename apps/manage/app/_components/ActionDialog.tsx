"use client";

import type { ActionState } from "@repo/console/action-state";
import { useActionForm } from "@repo/console/use-action-form";
import { Button } from "@repo/ui/button";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { FormError } from "@repo/ui/form-error";
import { useState, type ComponentProps, type ReactNode } from "react";

/**
 * A button that opens a dialog holding a form for one server action: the
 * fields the caller gives, its hidden values, and Save. Billing's moves
 * are made with it: change terms, void, record a payment, add a charge or
 * a stop, cancel with a fee. As every console form, a refusal stays in the
 * dialog at its field with everything typed, and a save toasts `done`,
 * closes it and opens the page the action answered, if any. `children` may
 * be a function of whether it is open, for fields that load as it opens.
 */
export function ActionDialog({
  action,
  label,
  title,
  description,
  done,
  submit,
  pending: pendingLabel = "Saving…",
  hidden = {},
  danger = false,
  width = "sm",
  variant = "secondary",
  size = "sm",
  disabled = false,
  icon,
  footer,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** The button that opens it. */
  label: string;
  title: string;
  description?: ReactNode;
  /** The toast once saved. */
  done: string;
  /** The submit button's words: "Record payment". */
  submit: string;
  pending?: string;
  /** Values posted with the fields: the record's id. */
  hidden?: Record<string, string>;
  /** The submit is red: a void, a cancel. */
  danger?: boolean;
  width?: ComponentProps<typeof Dialog>["width"];
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  icon?: ReactNode;
  /** Under the fields, over the buttons: what saving bills, say. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { pending, error, formProps } = useActionForm(action, {
    done,
    onDone: () => setOpen(false),
  });
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {icon}
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title={title}
        description={description}
        width={width}
      >
        <form {...formProps} className="grid gap-4">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {children}
          {footer}
          <FormError error={error} />
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={danger ? "danger" : "primary"}
              pending={pending}
            >
              {pending ? pendingLabel : submit}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
