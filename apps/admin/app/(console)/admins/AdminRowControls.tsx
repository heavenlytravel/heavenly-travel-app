"use client";

import type { AdminTeam } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Sheet } from "@repo/ui/sheet";
import { useState } from "react";
import { FormError } from "../../_components/FormError";
import { useActionForm } from "../../_lib/use-action-form";
import { AdminFields } from "./AdminFields";
import { revokeAdminAction, setAdminAction } from "./actions";

/** Edit the level and teams, and revoke, for one row of the admins table. */
export function AdminRowControls({
  userId,
  email,
  level,
  teams,
}: {
  userId: string;
  email: string;
  level: string;
  teams: readonly AdminTeam[];
}) {
  const [editing, setEditing] = useState(false);
  const edit = useActionForm(setAdminAction, {
    done: `Saved the level and teams of ${email}.`,
    onDone: () => setEditing(false),
  });
  const [dialog, confirm] = useConfirm();
  const revoke = useActionForm(revokeAdminAction, {
    ask: () =>
      confirm({
        title: `Remove admin access for ${email}?`,
        description:
          "They can no longer open the console. Promoting them again here gives it back.",
        action: "Revoke",
        danger: true,
      }),
    done: `Removed admin access for ${email}.`,
  });

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <form {...revoke.formProps}>
          <input type="hidden" name="userId" value={userId} />
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={revoke.pending}
          >
            Revoke
          </Button>
        </form>
      </div>
      {dialog}
      <FormError error={revoke.error} size="xs" />

      <Sheet
        open={editing}
        onOpenChange={setEditing}
        title={`Level and teams for ${email}`}
      >
        <form {...edit.formProps} className="grid gap-5 p-6 text-left">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Level and teams
            </h2>
            <p className="mt-1 text-sm break-all text-neutral-600">{email}</p>
          </div>
          <input type="hidden" name="email" value={email} />
          <AdminFields level={level} teams={teams} />
          <p className="text-xs text-neutral-500">
            A REGULAR admin needs at least one team. SUPER reaches every screen
            and needs none.
          </p>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={edit.pending}>
              {edit.pending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              disabled={edit.pending}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
          <FormError error={edit.error} />
        </form>
      </Sheet>
    </div>
  );
}
