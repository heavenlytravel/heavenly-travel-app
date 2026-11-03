import { getVendor } from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { requireMember, shellMember } from "../../../_lib/access";
import { FormFrame } from "../../../_ui/FormFrame";
import { BandHeading, Screen } from "../../../_ui/Screen";
import { BusinessForm } from "../BusinessForm";

/** Route: /business/edit. The owner's form for the business's contact, address and bank. */
export default async function EditBusinessPage() {
  const member = await requireMember();
  if (member.role !== "owner") redirect("/~/business");
  const vendor = await getVendor(member.vendor.id);
  if (!vendor) notFound();
  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: "/~/business", label: "Business" }}
      band={
        <BandHeading eyebrow={vendor.name} title="Edit details">
          Where we reach you, and where we pay you.
        </BandHeading>
      }
    >
      <FormFrame>
        <BusinessForm vendor={vendor} />
      </FormFrame>
    </Screen>
  );
}
