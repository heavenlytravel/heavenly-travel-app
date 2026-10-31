"use client";

import type { AdminTeam } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { useState } from "react";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { AdminAccessSheet } from "./AdminAccessSheet";
import { revokeAdminAction } from "./actions";

/** Edit the level and teams, and revoke, for one row of the staff table. */
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
            pending={revoke.pending}
          >
            Revoke
          </Button>
        </form>
      </div>
      {dialog}
      <FormError error={revoke.error} size="xs" />

      <AdminAccessSheet
        open={editing}
        onOpenChange={setEditing}
        email={email}
        level={level}
        teams={teams}
        submit="Save"
        done={`Saved the level and teams of ${email}.`}
      />
    </div>
  );
}
