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

export const metadata: Metadata = { title: "Your driver profile | Connect" };

/**
 * Route: /account/driver. The signed-in driver's own record, as their
 * vendor keeps it, every sensitive detail blurred until clicked. Their
 * vendor's people change it, in Fleet; the driver asks them.
 */
export default async function DriverProfilePage() {
  const access = await requireSignedIn();
  if (access.status !== "ok" || !access.driver) redirect(ACCOUNT_PATH);
  const driver = await getDriver(access.driver.id);
  if (!driver) notFound();
  const member = memberOf(access);
  const edits = member?.vendor.id === driver.vendorId;
  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: ACCOUNT_PATH, label: "Account" }}
      band={
        <BandHeading eyebrow={driver.vendor.name} title="Your driver profile">
          How {driver.vendor.name} has you as a driver, and where we pay you.
        </BandHeading>
      }
    >
      <Panel className="connect-rise grid gap-4 p-6">
        <DriverDetails driver={driver} />
        {edits ? (
          <Button asChild className="justify-self-start">
            <Link href={`/~/drivers/${driver.id}`}>Edit in Fleet</Link>
          </Button>
        ) : (
          <p className="text-xs text-muted">
            To change any of these, ask {driver.vendor.name}.
          </p>
        )}
      </Panel>
    </Screen>
  );
}
