import { SignOutButton, UserButton } from "@clerk/nextjs";
import { getAccess } from "@repo/db/server";
import { redirect } from "next/navigation";

export default async function AdminHome() {
  const access = await getAccess("admin");
  if (access.status === "signed-out") redirect("/sign-in");

  if (access.status !== "ok") {
    return (
      <main className="mx-auto max-w-md px-5 pt-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No admin access
        </h1>
        <p className="mt-3 text-neutral-600">
          {access.user.email} is signed in but has no admin profile.
        </p>
        <SignOutButton>
          <button className="mt-8 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100">
            Sign out
          </button>
        </SignOutButton>
      </main>
    );
  }

  const { user } = access;
  return (
    <main className="mx-auto max-w-5xl px-5 pt-12 pb-32">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Heavenly Travel Admin
        </h1>
        <UserButton />
      </header>
      <p className="mt-6 text-neutral-600">
        Signed in as {user.email}, level {user.adminProfile?.level}
      </p>
    </main>
  );
}
