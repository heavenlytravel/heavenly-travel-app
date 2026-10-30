import { notFound } from "next/navigation";
import {
  getVehicle,
  heldBookingsOf,
  listModelSuggestions,
  vendorFleetChoices,
} from "@repo/db/server";
import { VehicleForm } from "@repo/console/VehicleForm";
import { FormFrame } from "../../_ui/FormFrame";
import { BandHeading, Screen } from "../../_ui/Screen";
import { requireMember, shellMember } from "../../_lib/access";
import { saveVehicleAction } from "../../fleet-actions";

/** Where Connect's vehicle form stores a photo. */
const UPLOAD_PATH = "/api/uploads/vehicle-image";

/**
 * Route: /vehicles/[id], and /vehicles/new. A vendor's vehicle on the
 * admin's form, narrowed: based at a location the vendor serves, of a
 * class on sale there, its model picked or typed new. Its photos are
 * optional and never reach the website.
 */
export default async function VehiclePage({
  params,
}: PageProps<"/vehicles/[id]">) {
  const member = await requireMember();
  const { id } = await params;
  const isNew = id === "new";
  const [vehicle, choices, suggestions, held] = await Promise.all([
    isNew ? null : getVehicle(id),
    vendorFleetChoices(member.vendor.id),
    listModelSuggestions(),
    isNew ? [] : heldBookingsOf({ vehicleId: id }),
  ]);
  if (!isNew && vehicle?.vendorId !== member.vendor.id) notFound();
  const [only] = choices.locations.length === 1 ? choices.locations : [];

  return (
    <Screen
      member={shellMember(member)}
      width="narrow"
      back={{ href: "/vehicles", label: "Vehicles" }}
      band={
        <BandHeading
          eyebrow={member.vendor.name}
          title={vehicle ? vehicle.plate : "Add vehicle"}
        >
          Its class is what we sell: we offer you jobs of that class where it is
          based.
        </BandHeading>
      }
    >
      <FormFrame>
        <VehicleForm
          key={vehicle?.id ?? "new"}
          vehicle={vehicle ?? undefined}
          vendorId={member.vendor.id}
          locationId={only?.id}
          classes={choices.classes}
          classesAt={choices.classesAt}
          suggestions={suggestions}
          locations={choices.locations}
          action={saveVehicleAction}
          uploadPath={UPLOAD_PATH}
          photosNote="Optional, for our team: they never show on the website. The first is its cover."
          cancelHref="/vehicles"
          held={held}
        />
      </FormFrame>
    </Screen>
  );
}
