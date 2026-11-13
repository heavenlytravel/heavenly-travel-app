import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDriver } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { DriverDetails } from "../../../_components/ProfileDetails";
import { memberOf, requireSignedIn, shellMember } from "../../../_lib/access";
import { ACCOUNT_PATH } from "../../../_ui/nav";
import { Panel } from "../../../_ui/parts";
import { BandHeading, Screen } from "../../../_ui/Screen";

export const metadata: Metadata = { title: "Your Driver Profile | Connect" };

/**
 * Route: /account/driver. The signed-in driver's own record, as their
 * vendor keeps it, every sensitive detail blurred until clicked. The
 * driver edits their name, phone, licences and bank
 * (/account/driver/edit); the rest, their vendor's people in Fleet.
 */
export default async function DriverProfilePage() {
  const access = await requireSignedIn();
  if (access.status !== "ok" || !access.driver) redirect(ACCOUNT_PATH);
  const driver = await getDriver(access.driver.id);
  if (!driver) notFound();
  const member = memberOf(access);
  // Their vendor's owner or staff may change the rest too, in Fleet.
  const inFleet = member?.vendor.id === driver.vendorId;
  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: ACCOUNT_PATH, label: "Account" }}
      band={
        <BandHeading eyebrow={driver.vendor.name} title="Your Driver Profile">
          How {driver.vendor.name} has you as a driver, and where we pay you.
        </BandHeading>
      }
    >
      <Panel className="connect-rise grid gap-4 p-6">
        <DriverDetails driver={driver} />
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/~/account/driver/edit">Edit Your Profile</Link>
          </Button>
          {inFleet ? (
            <Button asChild variant="secondary">
              <Link href={`/~/drivers/${driver.id}`}>Edit in Fleet</Link>
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted">
          Where you are based and what you drive{" "}
          {inFleet
            ? "are changed in Fleet."
            : `are changed by ${driver.vendor.name}.`}
        </p>
      </Panel>
    </Screen>
  );
}
