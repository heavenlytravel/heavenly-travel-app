import { SignOutButton } from "@clerk/nextjs";
import { getAccess } from "@repo/db/server";
import { AuthShell } from "@repo/ui/auth-shell";
import { Button } from "@repo/ui/button";
import { redirect } from "next/navigation";

export default async function NoAccessPage() {
  const access = await getAccess("admin");
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status === "ok") redirect("/");

  return (
    <AuthShell tone="dark" eyebrow="Admin portal">
      <div className="w-full max-w-[26rem] rounded-xl bg-white p-8 text-center text-neutral-900 shadow-[0_22px_55px_rgba(9,43,39,0.14)]">
        <h1 className="text-2xl font-semibold tracking-tight">
          No admin access
        </h1>
        <p className="mt-3 text-neutral-600">
          {access.user.email} is signed in but has no admin profile. Access is
          by invitation from a SUPER admin.
        </p>
        <SignOutButton>
          <Button variant="secondary" className="mt-8">
            Sign out
          </Button>
        </SignOutButton>
      </div>
    </AuthShell>
  );
}
