import { getVendor } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VendorDetails } from "../../../_components/VendorDetails";
import { requireMember, shellMember } from "../../../_lib/access";
import { ACCOUNT_PATH } from "../../../_ui/nav";
import { Panel } from "../../../_ui/parts";
import { BandHeading, Screen } from "../../../_ui/Screen";

/**
 * Route: /account/business. The vendor's details for its people, every sensitive
 * one blurred until clicked. Its owner edits all of it but what it offers
 * (/account/business/edit), which the team changes. See
 * docs/261103-tour-guide.md, "Pay and bank details".
 */
export default async function BusinessPage() {
  const member = await requireMember();
  const vendor = await getVendor(member.vendor.id);
  if (!vendor) notFound();
  const owner = member.role === "owner";
  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: ACCOUNT_PATH, label: "Account" }}
      band={
        <BandHeading eyebrow={vendor.name} title="Business">
          {owner
            ? "Keep your details up to date: we pay your jobs into this account."
            : "Your business as we know it. Its owner keeps it up to date."}
        </BandHeading>
      }
    >
      <Panel className="connect-rise grid gap-4 p-6">
        <VendorDetails vendor={vendor} />
        {owner ? (
          <div className="grid gap-2">
            <Button asChild className="justify-self-start">
              <Link href="/~/account/business/edit">Edit details</Link>
            </Button>
            <p className="text-xs text-muted">
              What you offer is set by the team. To change it, WhatsApp the
              team.
            </p>
          </div>
        ) : null}
      </Panel>
    </Screen>
  );
}
