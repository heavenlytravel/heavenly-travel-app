"use client";

import { ADMIN_LEVELS } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Select } from "@repo/ui/field";
import { useActionState } from "react";
import { revokeAdminAction, setAdminLevelAction } from "./actions";

/** Change level and revoke, for one row of the admins table. */
export function AdminRowControls({
  userId,
  email,
  level,
}: {
  userId: string;
  email: string;
  level: string;
}) {
  const [levelResult, levelAction, levelPending] = useActionState(
    setAdminLevelAction,
    null,
  );
  const [revokeResult, revokeAction, revokePending] = useActionState(
    revokeAdminAction,
    null,
  );
  const error = [levelResult, revokeResult].find((r) => r?.ok === false);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <form action={levelAction}>
          <input type="hidden" name="email" value={email} />
          <Select
            name="level"
            aria-label={`Level for ${email}`}
            // Remount when the saved level changes so the select follows it.
            key={level}
            defaultValue={level}
            disabled={levelPending}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="h-8 w-28 px-2 text-xs"
          >
            {ADMIN_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </form>
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
      {error && !error.ok ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error.error}
        </p>
      ) : null}
    </div>
  );
}
