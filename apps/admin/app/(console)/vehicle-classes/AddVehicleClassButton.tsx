"use client";

import { Button } from "@repo/ui/button";
import { useState } from "react";
import { VehicleClassSheet } from "./VehicleClassSheet";

/** "Add class": the same sheet as Edit, starting from the category's usual rules. */
export function AddVehicleClassButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add class</Button>
      <VehicleClassSheet
        // A fresh form each time it opens.
        key={open ? "open" : "closed"}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
