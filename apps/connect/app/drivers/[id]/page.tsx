import { notFound } from "next/navigation";
import { getDriver, heldBookingsOf, vendorFleetChoices } from "@repo/db/server";
import { DriverForm } from "@repo/console/DriverForm";
import { FormFrame } from "../../_ui/FormFrame";
import { BandHeading, Screen } from "../../_ui/Screen";
import { requireMember, shellMember } from "../../_lib/access";
import { saveDriverAction } from "../../fleet-actions";

/**
 * Route: /drivers/[id], and /drivers/new. A vendor's driver on the admin's
 * form, narrowed: based at a location the vendor serves, allowed only on
 * classes on sale where it serves.
 */
export default async function DriverPage({
  params,
}: PageProps<"/drivers/[id]">) {
  const member = await requireMember();
  const { id } = await params;
  const isNew = id === "new";
  const [driver, choices, held] = await Promise.all([
    isNew ? null : getDriver(id),
    vendorFleetChoices(member.vendor.id),
    isNew ? [] : heldBookingsOf({ driverId: id }),
  ]);
  if (!isNew && driver?.vendorId !== member.vendor.id) notFound();
  const [only] = choices.locations.length === 1 ? choices.locations : [];

  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: "/drivers", label: "Drivers" }}
      band={
        <BandHeading
          eyebrow={member.vendor.name}
          title={driver ? driver.name : "Add driver"}
        >
          We offer you jobs for them on the classes they may drive, where they
          are based.
        </BandHeading>
      }
    >
      <FormFrame>
        <DriverForm
          key={driver?.id ?? "new"}
          driver={driver ?? undefined}
          vendorId={member.vendor.id}
          locationId={only?.id}
          classes={choices.classes}
          locations={choices.locations}
          action={saveDriverAction}
          backHref="/drivers"
          held={held}
        />
      </FormFrame>
    </Screen>
  );
}
