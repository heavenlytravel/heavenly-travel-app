"use client";

import { Button } from "@repo/ui/button";
import { HistoryIcon } from "@repo/ui/icons";
import { Sheet } from "@repo/ui/sheet";
import { useState, type ReactNode } from "react";

/**
 * A record's history behind a button: "History" opens a sheet from the
 * right with the list inside, so the page itself shows only what is
 * current. The list is rendered by the caller, on the server, and handed
 * over as children.
 */
export function HistorySheet({
  title,
  description,
  children,
}: {
  /** The sheet's heading: "History of Langkawi". */
  title: string;
  /** What the list holds, under the heading. */
  description: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <HistoryIcon />
        History
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={title} width="lg">
        <div className="flex min-h-full flex-col">
          <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close history"
              className="-mr-2 shrink-0 px-2"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
          <div className="px-5 py-2">{children}</div>
        </div>
      </Sheet>
    </>
  );
}
