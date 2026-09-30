"use client";

import type { AdminChange, AdminTeam } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Sheet } from "@repo/ui/sheet";
import { useActionState, useState } from "react";
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
  const [editResult, editAction, editPending] = useActionState(
    async (previous: AdminChange | null, formData: FormData) => {
      const result = await setAdminAction(previous, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    null,
  );
  const [revokeResult, revokeAction, revokePending] = useActionState(
    revokeAdminAction,
    null,
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <form
          action={revokeAction}
          onSubmit={(event) => {
            if (!confirm(`Remove admin access for ${email}?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={revokePending}
          >
            Revoke
          </Button>
        </form>
      </div>
      {revokeResult?.ok === false ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {revokeResult.error}
        </p>
      ) : null}

      <Sheet
        open={editing}
        onOpenChange={setEditing}
        title={`Level and teams for ${email}`}
      >
        <form action={editAction} className="grid gap-5 p-6 text-left">
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
            <Button type="submit" disabled={editPending}>
              {editPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              disabled={editPending}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
          {editResult?.ok === false ? (
            <p aria-live="polite" className="text-sm text-red-700">
              {editResult.error}
            </p>
          ) : null}
        </form>
      </Sheet>
    </div>
  );
}
