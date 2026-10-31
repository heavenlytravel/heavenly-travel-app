"use client";

import type { AdminTeam } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Sheet, SheetHeader } from "@repo/ui/sheet";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { AdminFields } from "./AdminFields";
import { setAdminAction } from "./actions";

/**
 * The panel that sets one account's level and teams: a member's Edit on
 * Admin, and Make admin on a user's page.
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
      title={`Level and teams for ${email}`}
    >
      <form {...formProps} className="grid gap-5 p-6 text-left">
        <SheetHeader title="Level and teams" description={email} />
        <input type="hidden" name="email" value={email} />
        <AdminFields level={level} teams={teams} />
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
