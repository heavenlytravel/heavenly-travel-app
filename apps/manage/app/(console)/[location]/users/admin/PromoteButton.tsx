"use client";

import { Button } from "@repo/ui/button";
import { useState } from "react";
import { AdminAccessSheet } from "./AdminAccessSheet";

/** "Make admin" on a user's page: opens the level and teams for that account. */
export function PromoteButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Make admin
      </Button>
      <AdminAccessSheet
        open={open}
        onOpenChange={setOpen}
        email={email}
        submit="Promote"
        done={`${email} is now an admin.`}
      />
    </>
  );
}
