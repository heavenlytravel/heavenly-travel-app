import { SignOutButton } from "@clerk/nextjs";
import { getAccess } from "@repo/db/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";
import { Logo } from "@repo/ui/logo";
import { redirect } from "next/navigation";
import { PortalCard } from "../_components/PortalCard";

export default async function NoAccessPage() {
  const access = await getAccess("admin");
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status === "ok") redirect("/");

  return (
    <AuthShell
      tone="dark"
      eyebrow="Admin portal"
      brand={<Logo tone="white" loading="eager" className="h-9" />}
    >
      <PortalCard title="No admin access">
        <p className="mt-3 text-muted">
          {/* A long address breaks where it must, not past the card. */}
          <span className="[overflow-wrap:anywhere]">
            {access.user.email}
          </span>{" "}
          is signed in but has no admin profile. Access is by invitation from a
          SUPER admin.
        </p>
        <SignOutButton>
          <Button variant="secondary" className="mt-8">
            Sign out
          </Button>
        </SignOutButton>
      </PortalCard>
    </AuthShell>
  );
}
