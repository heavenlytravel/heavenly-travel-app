import { notFound } from "next/navigation";
import { GUIDE_DELETE_IMPACT, vendorAddsOf } from "@repo/db";
import { getGuide, heldBookingsOf, vendorFleetChoices } from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
import { DeleteButton } from "@repo/console/DeleteButton";
import { GuideForm } from "@repo/console/GuideForm";
import { FormFrame } from "../../../_ui/FormFrame";
import { BandHeading, Screen } from "../../../_ui/Screen";
import { requireMember, shellMember } from "../../../_lib/access";
import { deleteGuideAction, saveGuideAction } from "../../../fleet-actions";

/**
 * Route: /guides/[id], and /guides/new. A vendor's tour guide on the
 * admin's form, narrowed: based at a location the vendor serves. Under
 * it, the delete for one entered by mistake.
 */
export default async function GuidePage({
  params,
}: PageProps<"/~/guides/[id]">) {
  const member = await requireMember();
  const { id } = await params;
  const isNew = id === "new";
  const [guide, choices, held] = await Promise.all([
    isNew ? null : getGuide(id),
    vendorFleetChoices(member.vendor.id),
    isNew ? [] : heldBookingsOf({ guideId: id }),
  ]);
  if (!isNew && guide?.vendorId !== member.vendor.id) notFound();
  // A new one only of what it offers, by the services it ticked.
  if (isNew && !vendorAddsOf(member.vendor).guides) notFound();
  const [only] = choices.locations.length === 1 ? choices.locations : [];

  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: "/~/guides", label: "Guides" }}
      band={
        <BandHeading
          eyebrow={member.vendor.name}
          title={guide ? guide.name : "Add tour guide"}
        >
          We offer you trips with a tour guide where they are based.
        </BandHeading>
      }
    >
      <FormFrame>
        <GuideForm
          key={guide?.id ?? "new"}
          guide={guide ?? undefined}
          vendorId={member.vendor.id}
          locationId={only?.id}
          locations={choices.locations}
          action={saveGuideAction}
          cancelHref="/~/guides"
          held={held}
        />
        {guide ? (
          <Card className="mt-5">
            <CardTitle description="For a tour guide entered by mistake. One who has been on a trip is made inactive instead.">
              Delete tour guide
            </CardTitle>
            <DeleteButton
              label="Delete tour guide"
              title={`Delete ${guide.name}?`}
              impact={GUIDE_DELETE_IMPACT}
              action={deleteGuideAction.bind(null, guide.id)}
              doneHref="/~/guides"
              doneMessage={`Deleted ${guide.name}.`}
            />
          </Card>
        ) : null}
      </FormFrame>
    </Screen>
  );
}
