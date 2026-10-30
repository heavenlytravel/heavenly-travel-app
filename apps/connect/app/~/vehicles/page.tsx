import Link from "next/link";
import { modelName, VEHICLE_DOCUMENTS, vehicleDocumentsDue } from "@repo/db";
import { listDrivers, listVehicles } from "@repo/db/server";
import { CarFrontIcon, PlusIcon } from "@repo/ui/icons";
import { FleetList } from "../../_components/FleetList";
import { FleetTabs } from "../../_components/FleetTabs";
import { requireMember, shellMember } from "../../_lib/access";
import { Button } from "@repo/ui/button";
import { Plate } from "../../_ui/parts";
import { BandHeading, Screen } from "../../_ui/Screen";

/**
 * Route: /vehicles. A vendor's own vehicles, for its owner and staff, each
 * opening the form the admin uses. A vehicle saved here can be assigned
 * at once: it needs no approval of its own. See
 * docs/261028-fulfilment-vendors-and-connect.md, "A vendor's vehicles and
 * drivers".
 */
export default async function VehiclesPage() {
  const member = await requireMember();
  const [vehicles, drivers] = await Promise.all([
    listVehicles({ vendorId: member.vendor.id }),
    listDrivers({ vendorId: member.vendor.id }),
  ]);
  const add = (
    <Button asChild variant="secondary" size="sm">
      <Link href="/~/vehicles/new">
        <PlusIcon />
        Add
      </Link>
    </Button>
  );
  return (
    <Screen
      member={shellMember(member)}
      band={
        <div className="grid gap-5">
          <BandHeading eyebrow={member.vendor.name} title="Fleet" action={add}>
            We offer you jobs for each vehicle&apos;s class, where it is based.
          </BandHeading>
          <FleetTabs
            current="vehicles"
            vehicles={vehicles.length}
            drivers={drivers.length}
          />
        </div>
      }
    >
      <FleetList
        items={vehicles.map((v) => ({
          id: v.id,
          lead: <Plate>{v.plate}</Plate>,
          title: modelName(v.vehicleModel),
          detail: `${v.vehicleModel.vehicleClass.name} · ${v.location.name}`,
          isActive: v.isActive,
          due: vehicleDocumentsDue(v),
          anyEntered: VEHICLE_DOCUMENTS.some((key) => v[key]),
        }))}
        hrefOf={(id) => `/vehicles/${id}`}
        empty={{
          icon: CarFrontIcon,
          title: "No vehicle yet",
          text: "Add one to be offered jobs for it. It can take jobs as soon as it is saved.",
          action: (
            <Button asChild>
              <Link href="/~/vehicles/new">
                <PlusIcon />
                Add a vehicle
              </Link>
            </Button>
          ),
        }}
      />
    </Screen>
  );
}
