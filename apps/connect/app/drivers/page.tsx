import Link from "next/link";
import { DRIVER_DOCUMENTS, driverDocumentsDue } from "@repo/db";
import { listDrivers } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { PageHeader } from "@repo/console/PageHeader";
import { ConnectShell } from "../_components/ConnectShell";
import { FleetRows } from "../_components/FleetRows";
import { requireMember, shellMember } from "../_lib/access";

/**
 * Route: /drivers. A vendor's own drivers, for its owner and staff, each
 * opening the form the admin uses. A driver signs in to Connect with the
 * email entered here, to accept and report their jobs; someone who drives
 * for their own vendor adds their own email. See
 * docs/261028-fulfilment-vendors-and-connect.md, "A vendor's vehicles and
 * drivers".
 */
export default async function DriversPage() {
  const member = await requireMember();
  const drivers = await listDrivers({ vendorId: member.vendor.id });
  return (
    <ConnectShell member={shellMember(member)}>
      <PageHeader
        title="Drivers"
        description="Each signs in to Connect with the email you enter here, to accept and report their jobs. If you drive yourself, add yourself with your own email."
        action={
          <Button asChild>
            <Link href="/drivers/new">Add driver</Link>
          </Button>
        }
      />
      <FleetRows
        rows={drivers.map((d) => ({
          id: d.id,
          title: d.name,
          detail: `${d.vehicleClasses.map((c) => c.name).join(", ")} · ${d.location.name}${d.email ? "" : " · no email, so cannot sign in"}`,
          isActive: d.isActive,
          due: driverDocumentsDue(d),
          anyEntered: DRIVER_DOCUMENTS.some((key) => d[key]),
        }))}
        hrefOf={(id) => `/drivers/${id}`}
        emptyMessage="No driver yet. Add one to be offered jobs for them."
      />
    </ConnectShell>
  );
}
