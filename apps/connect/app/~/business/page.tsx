import { getVendor } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VendorDetails } from "../../_components/VendorDetails";
import { requireMember, shellMember } from "../../_lib/access";
import { Panel } from "../../_ui/parts";
import { BandHeading, Screen } from "../../_ui/Screen";

/**
 * Route: /business. The vendor's details for its people, every sensitive
 * one blurred until clicked. Its owner edits the contact, the address and
 * the bank (/business/edit); what was checked at approval, the team
 * changes. See docs/261103-tour-guide.md, "Pay and bank details".
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
      band={
        <BandHeading eyebrow={vendor.name} title="Business">
          {owner
            ? "Keep your contact and bank details up to date: we pay your vehicles' jobs into this account."
            : "Your business as we know it. Its owner keeps it up to date."}
        </BandHeading>
      }
    >
      <Panel className="connect-rise grid gap-4 p-6">
        <VendorDetails vendor={vendor} />
        {owner ? (
          <div className="grid gap-2">
            <Button asChild className="justify-self-start">
              <Link href="/~/business/edit">Edit details</Link>
            </Button>
            <p className="text-xs text-muted">
              The name, the SSM or IC number, the services and the locations
              were checked when you were approved. To change one, WhatsApp the
              team.
            </p>
          </div>
        ) : null}
      </Panel>
    </Screen>
  );
}
