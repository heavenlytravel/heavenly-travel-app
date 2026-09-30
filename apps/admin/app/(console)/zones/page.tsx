import Link from "next/link";
import { formatLocalDateTime, formatMultiplier } from "@repo/db";
import { listZones } from "@repo/db/server";
import { PageHeader } from "../../_components/PageHeader";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../../_components/Table";
import { requireAdmin } from "../../_lib/access";
import { zoneHref } from "../../_lib/routes";
import { AddZoneButton } from "./AddZoneButton";
import { ZoneActiveSwitch } from "./ZoneActiveSwitch";

const DISTRICTS_SHOWN = 3;

/** "Kuala Lumpur, Putrajaya, Petaling Jaya and 24 more" */
function districtsText(districts: readonly { district: string }[]) {
  const names = districts.map((d) => d.district);
  const shown = names.slice(0, DISTRICTS_SHOWN).join(", ");
  const more = names.length - DISTRICTS_SHOWN;
  return more > 0 ? `${shown} and ${more} more` : shown;
}

/**
 * Route: /zones. Where the site sells, one row per zone. Operation's screen
 * behind `coverage.manage`. Zones are never deleted, only turned off.
 */
export default async function ZonesPage() {
  await requireAdmin("coverage.manage");
  const zones = await listZones();

  return (
    <>
      <PageHeader
        title="Zones"
        description="A zone is a set of towns, spelled as Google names them, with one price multiplier. A pickup outside every active zone is told the area is not served yet."
        action={<AddZoneButton />}
      />

      <div className="mt-6">
        <Table>
          <THead>
            <Th>Zone</Th>
            <Th>Active</Th>
            <Th>Price</Th>
            <Th>Districts</Th>
            <Th>Changed</Th>
          </THead>
          <TBody>
            {zones.length === 0 ? (
              <EmptyRow colSpan={5}>No zones yet.</EmptyRow>
            ) : (
              zones.map((zone) => (
                <tr
                  key={zone.id}
                  className={zone.isActive ? undefined : "text-neutral-500"}
                >
                  <Td className="font-medium">
                    <Link
                      href={zoneHref(zone.id)}
                      className="underline-offset-4 hover:underline"
                    >
                      {zone.name}
                    </Link>
                  </Td>
                  <Td>
                    <ZoneActiveSwitch
                      id={zone.id}
                      name={zone.name}
                      active={zone.isActive}
                    />
                  </Td>
                  <Td className="tabular-nums">
                    {zone.multiplier === 1
                      ? "no change"
                      : formatMultiplier(zone.multiplier)}
                  </Td>
                  <Td>
                    <span className="block">
                      {zone.districts.length === 1
                        ? "1 name"
                        : `${zone.districts.length} names`}
                    </span>
                    {zone.districts.length > 0 ? (
                      <span className="block text-xs text-neutral-500">
                        {districtsText(zone.districts)}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-neutral-600 tabular-nums">
                    {zone.changedAt ? formatLocalDateTime(zone.changedAt) : "—"}
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </>
  );
}
