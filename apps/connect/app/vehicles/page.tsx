import Link from "next/link";
import { modelName, VEHICLE_DOCUMENTS, vehicleDocumentsDue } from "@repo/db";
import { listVehicles } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { PageHeader } from "@repo/console/PageHeader";
import { ConnectShell } from "../_components/ConnectShell";
import { FleetRows } from "../_components/FleetRows";
import { requireMember, shellMember } from "../_lib/access";

/**
 * Route: /vehicles. A vendor's own vehicles, for its owner and staff, each
 * opening the form the admin uses. A vehicle saved here can be assigned
 * at once: it needs no approval of its own. See
 * docs/261028-fulfilment-vendors-and-connect.md, "A vendor's vehicles and
 * drivers".
 */
export default async function VehiclesPage() {
  const member = await requireMember();
  const vehicles = await listVehicles({ vendorId: member.vendor.id });
  return (
    <ConnectShell member={shellMember(member)}>
      <PageHeader
        title="Vehicles"
        description="Your vehicles, where each is based and its documents due."
        action={
          <Button asChild>
            <Link href="/vehicles/new">Add vehicle</Link>
          </Button>
        }
      />
      <FleetRows
        rows={vehicles.map((v) => ({
          id: v.id,
          title: v.plate,
          detail: `${modelName(v.vehicleModel)} · ${v.vehicleModel.vehicleClass.name} · ${v.location.name}`,
          isActive: v.isActive,
          due: vehicleDocumentsDue(v),
          anyEntered: VEHICLE_DOCUMENTS.some((key) => v[key]),
        }))}
        hrefOf={(id) => `/vehicles/${id}`}
        emptyMessage="No vehicle yet. Add one to be offered jobs for it."
      />
    </ConnectShell>
  );
}
