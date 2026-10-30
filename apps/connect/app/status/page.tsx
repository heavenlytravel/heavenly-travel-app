import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegistrationStatus } from "../_components/RegistrationStatus";
import { requireSignedIn } from "../_lib/access";
import { HOME_PATH } from "../_ui/nav";

export const metadata: Metadata = { title: "Your registration | Connect" };

/**
 * Route: /status. Where a registration waiting for approval stands, the
 * only page of Connect its owner has until then. Anyone else goes to
 * `/~`, where Connect, or the reason it is shut, is.
 */
export default async function StatusPage() {
  const access = await requireSignedIn();
  if (access.status !== "pending") redirect(HOME_PATH);
  return (
    <RegistrationStatus
      vendorId={access.vendor.id}
      vendorName={access.vendor.name}
      email={access.user.email}
    />
  );
}
