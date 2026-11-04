import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getGuideByEmail } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { GuideDetails } from "../../../_components/ProfileDetails";
import { memberOf, requireSignedIn, shellMember } from "../../../_lib/access";
import { ACCOUNT_PATH } from "../../../_ui/nav";
import { Panel } from "../../../_ui/parts";
import { BandHeading, Screen } from "../../../_ui/Screen";

export const metadata: Metadata = { title: "Your guide profile | Connect" };

/**
 * Route: /account/guide. The tour guide record whose Connect email is the
 * signed-in account's, as their vendor keeps it, every sensitive detail
 * blurred until clicked. Their vendor's people change it, in Fleet.
 */
export default async function GuideProfilePage() {
  const access = await requireSignedIn();
  if (access.status !== "ok") redirect(ACCOUNT_PATH);
  const guide = await getGuideByEmail(access.user.email);
  if (!guide) redirect(ACCOUNT_PATH);
  const member = memberOf(access);
  const edits = member?.vendor.id === guide.vendorId;
  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: ACCOUNT_PATH, label: "Account" }}
      band={
        <BandHeading eyebrow={guide.vendor.name} title="Your guide profile">
          How {guide.vendor.name} has you as a tour guide, and where we pay you.
        </BandHeading>
      }
    >
      <Panel className="connect-rise grid gap-4 p-6">
        <GuideDetails guide={guide} />
        {edits ? (
          <Button asChild className="justify-self-start">
            <Link href={`/~/guides/${guide.id}`}>Edit in Fleet</Link>
          </Button>
        ) : (
          <p className="text-xs text-muted">
            To change any of these, ask {guide.vendor.name}.
          </p>
        )}
      </Panel>
    </Screen>
  );
}
