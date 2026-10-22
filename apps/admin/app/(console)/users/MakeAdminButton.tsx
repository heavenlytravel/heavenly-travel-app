"use client";

import { Button } from "@repo/ui/button";
import { useState } from "react";
import { AdminAccessSheet } from "../admins/AdminAccessSheet";

/** Opens the level and teams for one account on the Users screen, to make it staff. */
export function MakeAdminButton({ email }: { email: string }) {
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
        submit="Make admin"
        done={`${email} is now an admin.`}
      />
    </>
  );
}
