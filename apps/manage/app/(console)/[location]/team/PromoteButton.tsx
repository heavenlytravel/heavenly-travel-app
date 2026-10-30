"use client";

import { Button } from "@repo/ui/button";
import { useState } from "react";
import { AdminAccessSheet } from "./AdminAccessSheet";

/** "Promote to staff" on a customer's row: opens the level and teams for that account. */
export function PromoteButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Promote to staff
      </Button>
      <AdminAccessSheet
        open={open}
        onOpenChange={setOpen}
        email={email}
        submit="Promote"
        done={`${email} is now staff.`}
      />
    </>
  );
}
