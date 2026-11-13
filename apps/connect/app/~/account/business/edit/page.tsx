import { getVendor, listRegistrationLocations } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { requireMember, shellMember } from "../../../../_lib/access";
import { FormFrame } from "../../../../_ui/FormFrame";
import { BandHeading, Screen } from "../../../../_ui/Screen";
import { BusinessForm } from "../BusinessForm";

/** Route: /account/business/edit. The owner's form for the business: everything but what it offers. */
export default async function EditBusinessPage() {
  const member = await requireMember();
  if (member.role !== "owner") redirect("/~/account/business");
  const [vendor, open] = await Promise.all([
    getVendor(member.vendor.id),
    listRegistrationLocations(),
  ]);
  if (!vendor) notFound();
  // The locations taking vendors, and those it serves already.
  const locations = [
    ...open,
    ...vendor.locations.filter((l) => !open.some((o) => o.id === l.id)),
  ].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: "/~/account/business", label: "Business" }}
      band={
        <BandHeading eyebrow={vendor.name} title="Edit Details">
          Who you are, where we reach you, where you work and where we pay you.
        </BandHeading>
      }
    >
      <FormFrame>
        <BusinessForm vendor={vendor} locations={locations} />
      </FormFrame>
    </Screen>
  );
}
