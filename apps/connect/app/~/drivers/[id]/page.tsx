import { notFound } from "next/navigation";
import { DRIVER_DELETE_IMPACT, vendorAddsOf } from "@repo/db";
import { getDriver, heldBookingsOf, vendorFleetChoices } from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
import { DeleteButton } from "@repo/console/DeleteButton";
import { DriverForm } from "@repo/console/DriverForm";
import { FormFrame } from "../../../_ui/FormFrame";
import { BandHeading, Screen } from "../../../_ui/Screen";
import { requireMember, shellMember } from "../../../_lib/access";
import { deleteDriverAction, saveDriverAction } from "../../../fleet-actions";

/**
 * Route: /drivers/[id], and /drivers/new. A vendor's driver on the admin's
 * form, narrowed: based at a location the vendor serves, allowed only on
 * classes on sale where it serves. Under it, the delete for one entered
 * by mistake, as a mistyped email, which is locked once saved.
 */
export default async function DriverPage({
  params,
}: PageProps<"/~/drivers/[id]">) {
  const member = await requireMember();
  const { id } = await params;
  const isNew = id === "new";
  const [driver, choices, held] = await Promise.all([
    isNew ? null : getDriver(id),
    vendorFleetChoices(member.vendor.id),
    isNew ? [] : heldBookingsOf({ driverId: id }),
  ]);
  if (!isNew && driver?.vendorId !== member.vendor.id) notFound();
  // A new one only of what it offers, by the one service it chose.
  if (isNew && !vendorAddsOf(member.vendor).drivers) notFound();
  const [only] = choices.locations.length === 1 ? choices.locations : [];

  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: "/~/drivers", label: "Drivers" }}
      band={
        <BandHeading
          eyebrow={member.vendor.name}
          title={driver ? driver.name : "Add Driver"}
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
          cancelHref="/~/drivers"
          held={held}
        />
        {driver ? (
          <Card className="mt-5">
            <CardTitle description="For a driver entered by mistake, or with a mistyped email: delete them and add them again. One who has been on a job is made inactive instead.">
              Delete Driver
            </CardTitle>
            <DeleteButton
              label="Delete Driver"
              title={`Delete ${driver.name}?`}
              impact={DRIVER_DELETE_IMPACT}
              action={deleteDriverAction.bind(null, driver.id)}
              doneHref="/~/drivers"
              doneMessage={`Deleted ${driver.name}.`}
            />
          </Card>
        ) : null}
      </FormFrame>
    </Screen>
  );
}
