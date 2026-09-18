import { UserButton } from "@clerk/nextjs";
import { getAccess } from "@repo/db/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const access = await getAccess("user");
  if (access.status === "signed-out") redirect("/sign-in");

  const { user } = access;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const roles = [
    "customer",
    user.adminProfile && `admin (${user.adminProfile.level})`,
    user.driverProfile && "driver",
    user.partnerProfile && "partner",
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <main className="mx-auto max-w-3xl px-5 pt-16 pb-32">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
          <UserButton />
        </div>
        <dl className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-neutral-500">Name</dt>
            <dd>{name || "Not set"}</dd>
          </div>
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-neutral-500">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-4">
            <dt className="text-neutral-500">Access</dt>
            <dd>{roles.join(", ")}</dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
