import Link from "next/link";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";
import { Logo } from "@repo/ui/logo";
import { PortalCard } from "./_components/PortalCard";
import { dashboardHref } from "./_lib/routes";

/**
 * An address that leads nowhere, and a location slug no location has: on
 * the navy of the sign-in page, outside the sidebar, with the way to the
 * dashboard. A record not found inside the console has its own page,
 * `(console)/[location]/not-found.tsx`, in the console's chrome.
 */
export default function NotFound() {
  return (
    <AuthShell
      tone="dark"
      eyebrow="Admin portal"
      brand={<Logo tone="white" loading="eager" className="h-9" />}
    >
      <PortalCard title="Page Not Found">
        <p className="mt-3 text-muted">
          This address doesn&apos;t lead to a screen in the console.
        </p>
        <Button asChild className="mt-8">
          <Link href={dashboardHref(null)}>Go to the dashboard</Link>
        </Button>
      </PortalCard>
    </AuthShell>
  );
}
