"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";

/**
 * A console screen that failed to render: in the console's chrome, the
 * sidebar kept, with "Try again", which reads the screen again from the
 * server (`retry`; `reset` would only render it again). The error itself
 * is in the server's log, under its digest.
 */
export default function ConsoleError({ retry }: { retry: () => void }) {
  return (
    <>
      <PageHeader title="Something went wrong" />
      <Card className="max-w-xl">
        <p className="text-sm text-body">
          This screen could not load. Try again, or come back in a minute.
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => retry()}>
          Try again
        </Button>
      </Card>
    </>
  );
}
