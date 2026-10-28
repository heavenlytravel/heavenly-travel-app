import { redirect } from "next/navigation";
import { listRegistrationLocations } from "@repo/db/server";
import { ConnectShell } from "../_components/ConnectShell";
import { requireSignedIn } from "../_lib/access";
import { RegisterForm } from "./RegisterForm";

/**
 * Route: /register. A signed-in account that is neither a vendor's member
 * nor a driver registers a vendor, company or individual, and becomes its
 * owner. Anyone else goes home, where their screen says where they stand.
 * See docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
 */
export default async function RegisterPage() {
  const access = await requireSignedIn();
  if (access.status !== "register") redirect("/");
  const locations = await listRegistrationLocations();
  return (
    <ConnectShell>
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Register as a vendor
        </h1>
        <p className="text-slate-600">
          Supply vehicles, drivers or both for Heavenly Travel. We check every
          vendor; once approved, you add your vehicles and drivers here and
          accept the jobs we offer you. A driver for a vendor already with us
          does not register: their vendor adds them.
        </p>
      </div>
      <RegisterForm email={access.user.email} locations={locations} />
    </ConnectShell>
  );
}
