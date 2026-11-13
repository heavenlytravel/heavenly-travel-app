import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { driverFieldsOf } from "@repo/db";
import { getDriver } from "@repo/db/server";
import {
  memberOf,
  requireSignedIn,
  shellMember,
} from "../../../../_lib/access";
import { ACCOUNT_PATH } from "../../../../_ui/nav";
import { FormFrame } from "../../../../_ui/FormFrame";
import { BandHeading, Screen } from "../../../../_ui/Screen";
import { DriverSelfForm } from "../DriverSelfForm";

export const metadata: Metadata = { title: "Edit Your Profile | Connect" };

/** Route: /account/driver/edit. The driver's own form: their name, phone, licences and bank. */
export default async function EditDriverProfilePage() {
  const access = await requireSignedIn();
  if (access.status !== "ok" || !access.driver) redirect(ACCOUNT_PATH);
  const driver = await getDriver(access.driver.id);
  if (!driver) notFound();
  return (
    <Screen
      member={shellMember(memberOf(access))}
      width="narrow"
      back={{ href: "/~/account/driver", label: "Your Driver Profile" }}
      band={
        <BandHeading eyebrow={driver.vendor.name} title="Edit Your Profile">
          Where we reach you, your licences, and where we pay you.
        </BandHeading>
      }
    >
      <FormFrame>
        <DriverSelfForm fields={driverFieldsOf(driver)} />
      </FormFrame>
    </Screen>
  );
}
