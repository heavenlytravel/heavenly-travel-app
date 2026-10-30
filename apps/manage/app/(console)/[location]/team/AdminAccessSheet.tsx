"use client";

import type { AdminTeam } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { Sheet, SheetHeader } from "@repo/ui/sheet";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "../../../_lib/use-action-form";
import { AdminFields } from "./AdminFields";
import { setAdminAction } from "./actions";

/**
 * The panel that sets one account's level and teams: a member's Edit on
 * Staff, Promote to staff on a customer's row, and with no `email`,
 * Promote to staff on Staff, where the account is named by its email.
 */
export function AdminAccessSheet({
  open,
  onOpenChange,
  email,
  level,
  teams,
  submit,
  done,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account's email; none to type it here. */
  email?: string;
  level?: string;
  teams?: readonly AdminTeam[];
  /** The button: "Save", "Promote". */
  submit: string;
  /** The toast once it is set. */
  done: string;
}) {
  const { pending, error, formProps } = useActionForm(setAdminAction, {
    done,
    onDone: () => onOpenChange(false),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={email ? `Level and teams for ${email}` : "Promote to staff"}
    >
      <form {...formProps} className="grid gap-5 p-6 text-left">
        <SheetHeader
          title={email ? "Level and teams" : "Promote to staff"}
          description={
            email ??
            "They need an account: made on the site, or created on Customers."
          }
        />
        {email ? (
          <input type="hidden" name="email" value={email} />
        ) : (
          <Field label="Email">
            <Input
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@heavenlytravel.my"
            />
          </Field>
        )}
        <AdminFields level={level} teams={teams} />
        <p className="text-xs text-muted">
          A REGULAR admin needs at least one team. SUPER reaches every screen
          and needs none.
        </p>
        <div className="flex items-center gap-2">
          <Button type="submit" pending={pending}>
            {pending ? "Saving…" : submit}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
        <FormError error={error} />
      </form>
    </Sheet>
  );
}
