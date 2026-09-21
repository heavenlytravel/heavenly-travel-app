import { SignOutButton } from "@clerk/nextjs";
import { getAccess } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { redirect } from "next/navigation";

export default async function NoAccessPage() {
  const access = await getAccess("admin");
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status === "ok") redirect("/");

  return (
    <main className="mx-auto max-w-md px-5 pt-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">No admin access</h1>
      <p className="mt-3 text-neutral-600">
        {access.user.email} is signed in but has no admin profile. Access is by
        invitation from a SUPER admin.
      </p>
      <SignOutButton>
        <Button variant="secondary" className="mt-8">
          Sign out
        </Button>
      </SignOutButton>
    </main>
  );
}
