"use client";

import { Button } from "@repo/ui/button";
import { StopScreen } from "../../_components/StopScreen";

/**
 * A console screen that failed to render: in the console's chrome, the
 * sidebar kept, with "Try again", which reads the screen again from the
 * server (`retry`; `reset` would only render it again). The error itself
 * is in the server's log, under its digest.
 */
export default function ConsoleError({ retry }: { retry: () => void }) {
  return (
    <StopScreen
      title="Something Went Wrong"
      action={
        <Button variant="secondary" onClick={() => retry()}>
          Try again
        </Button>
      }
    >
      This screen could not load. Try again, or come back in a minute.
    </StopScreen>
  );
}
