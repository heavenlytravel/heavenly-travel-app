import Link from "next/link";
import { DRIVER_DOCUMENTS, driverDocumentsDue } from "@repo/db";
import { listDrivers, listVehicles } from "@repo/db/server";
import { Plus, UserRound } from "lucide-react";
import { FleetList } from "../_components/FleetList";
import { FleetTabs } from "../_components/FleetTabs";
import { requireMember, shellMember } from "../_lib/access";
import { buttonClass } from "../_ui/button";
import { Avatar } from "../_ui/parts";
import { BandHeading, Screen } from "../_ui/Screen";

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
  const [vehicles, drivers] = await Promise.all([
    listVehicles({ vendorId: member.vendor.id }),
    listDrivers({ vendorId: member.vendor.id }),
  ]);
  const add = (
    <Link
      href="/drivers/new"
      className={buttonClass({ variant: "glass", size: "sm" })}
    >
      <Plus aria-hidden className="size-4" />
      Add
    </Link>
  );
  return (
    <Screen
      member={shellMember(member)}
      band={
        <div className="grid gap-5">
          <BandHeading eyebrow={member.vendor.name} title="Fleet" action={add}>
            Each signs in with the email you enter, to take and report their
            jobs.
          </BandHeading>
          <FleetTabs
            current="drivers"
            vehicles={vehicles.length}
            drivers={drivers.length}
          />
        </div>
      }
    >
      <FleetList
        items={drivers.map((d) => ({
          id: d.id,
          lead: <Avatar name={d.name} />,
          title: d.name,
          detail: `${d.vehicleClasses.map((c) => c.name).join(", ") || "No class yet"} · ${d.location.name}`,
          flag: d.email
            ? d.userId
              ? undefined
              : "Not signed in to Connect yet"
            : "No email, so cannot sign in",
          isActive: d.isActive,
          due: driverDocumentsDue(d),
          anyEntered: DRIVER_DOCUMENTS.some((key) => d[key]),
        }))}
        hrefOf={(id) => `/drivers/${id}`}
        empty={{
          icon: UserRound,
          title: "No driver yet",
          text: "Add one to be offered jobs for them. Driving yourself? Add yourself, with your own email.",
          action: (
            <Link href="/drivers/new" className={buttonClass()}>
              <Plus aria-hidden className="size-4" />
              Add a driver
            </Link>
          ),
        }}
      />
    </Screen>
  );
}
