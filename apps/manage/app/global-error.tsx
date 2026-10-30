"use client";

import "@repo/ui/styles.css";
import "./globals.css";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";
import { Logo } from "@repo/ui/logo";
import { PortalCard } from "./_components/PortalCard";
import { fontVars } from "./fonts";

/**
 * What shows when the root layout itself fails, the console's chrome with
 * it: a document of its own, on the navy of the sign-in page, with "Try
 * again", which reads the page again from the server.
 */
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en" data-app="console" className={fontVars}>
      <body>
        <title>Something went wrong</title>
        <AuthShell
          tone="dark"
          eyebrow="Admin portal"
          brand={<Logo tone="white" loading="eager" className="h-9" />}
        >
          <PortalCard title="Something went wrong">
            <p className="mt-3 text-muted">
              This screen could not load. Try again, or come back in a minute.
            </p>
            <Button className="mt-8" onClick={() => retry()}>
              Try again
            </Button>
          </PortalCard>
        </AuthShell>
      </body>
    </html>
  );
}
