"use client";

import type { AdminTeam } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Sheet } from "@repo/ui/sheet";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "@repo/console/use-action-form";
import { AdminFields } from "./AdminFields";
import { setAdminAction } from "./actions";

/**
 * The panel that sets one account's admin level and teams: an admin's
 * Edit on the Admins screen, a user's Make admin on the Users screen.
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
  email: string;
  level?: string;
  teams?: readonly AdminTeam[];
  /** The button: "Save", "Make admin". */
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
      title={`Level and teams for ${email}`}
    >
      <form {...formProps} className="grid gap-5 p-6 text-left">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Level and teams
          </h2>
          <p className="mt-1 text-sm break-all text-slate-600">{email}</p>
        </div>
        <input type="hidden" name="email" value={email} />
        <AdminFields level={level} teams={teams} />
        <p className="text-xs text-slate-500">
          A REGULAR admin needs at least one team. SUPER reaches every screen
          and needs none.
        </p>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
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
