import Link from "next/link";
import { formatLocalDateTime } from "@repo/db";
import { getZone, listActivityFor } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { Badge } from "@repo/ui/badge";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import { Rows } from "../../../_components/Rows";
import { requireAdmin } from "../../../_lib/access";
import { ZONES_PATH } from "../../../_lib/routes";
import { ZoneActiveSwitch } from "../ZoneActiveSwitch";
import { AddressTester } from "./AddressTester";
import { Districts } from "./Districts";
import { ZoneForm } from "./ZoneForm";

/**
 * Route: /zones/[id]. One zone for Operation: its name and multiplier, its
 * switch, its districts, a field to test a real address against them, and
 * its history from the activity log.
 */
export default async function ZonePage({ params }: PageProps<"/zones/[id]">) {
  await requireAdmin("coverage.manage");
  const { id } = await params;
  const [zone, history] = await Promise.all([
    getZone(id),
    listActivityFor("zone", id),
  ]);
  if (!zone) notFound();

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={ZONES_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All zones
        </Link>
      </p>
      <PageHeader
        title={zone.name}
        description={
          zone.isActive
            ? "Active. Pickups in its towns are priced with its multiplier."
            : "Off. Pickups in its towns are told the area is not served yet."
        }
        action={
          <Badge tone={zone.isActive ? "green" : "neutral"}>
            {zone.isActive ? "Active" : "Off"}
          </Badge>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="grid gap-6">
          <Card>
            <CardTitle description="The multiplier applies to new quotes at once. A booking keeps the price it was made at.">
              Name and price
            </CardTitle>
            <ZoneForm
              id={zone.id}
              name={zone.name}
              multiplier={zone.multiplier}
            />
          </Card>

          <Card>
            <CardTitle description="The town names Google returns for addresses in the zone. A pickup whose town is listed here belongs to this zone.">
              Districts
            </CardTitle>
            <Districts zoneId={zone.id} districts={zone.districts} />
          </Card>

          <Card>
            <CardTitle description="Pick a real place to see the town Google carries for it and the zone it lands in, as a booking would.">
              Test an address
            </CardTitle>
            <AddressTester
              zoneId={zone.id}
              zoneName={zone.name}
              hasGoogle={hasGooglePlaces}
            />
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardTitle>Status</CardTitle>
            <div className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-neutral-500">Active</span>
              <ZoneActiveSwitch
                id={zone.id}
                name={zone.name}
                active={zone.isActive}
              />
            </div>
            <Rows
              rows={[
                ["Slug", <code key="slug">{zone.slug}</code>],
                ["Created", formatLocalDateTime(zone.createdAt)],
              ]}
            />
            <p className="mt-3 text-xs text-neutral-500">
              A zone with no districts stays off. Zones are never deleted, only
              turned off.
            </p>
          </Card>
          <Card>
            <CardTitle>History</CardTitle>
            <ActivityHistory
              entries={history}
              emptyMessage="No activity recorded. This zone was seeded before the log."
            />
          </Card>
        </div>
      </div>
    </>
  );
}
