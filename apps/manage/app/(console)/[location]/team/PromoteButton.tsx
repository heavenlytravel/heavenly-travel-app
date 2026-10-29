"use client";

import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { useState } from "react";
import { AdminAccessSheet } from "./AdminAccessSheet";

/**
 * "Promote to staff": opens the level and teams for an account. In Staff's
 * header, with no `email`, the account is named by the email typed in the
 * panel; on a customer's row, it is that account.
 */
export function PromoteButton({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {email ? (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Promote to staff
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Promote to staff
        </Button>
      )}
      <AdminAccessSheet
        open={open}
        onOpenChange={setOpen}
        email={email}
        submit="Promote"
        done={email ? `${email} is now staff.` : "Staff access granted."}
      />
    </>
  );
}
