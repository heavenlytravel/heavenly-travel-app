import Link from "next/link";
import { DRIVER_DOCUMENTS, driverDocumentsDue } from "@repo/db";
import type { DriverWithClasses } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { locationDriverHref } from "../_lib/routes";
import { DocumentsDue } from "./DocumentsDue";
import { EmptyRow, Table, TBody, Td, Th, THead } from "./Table";

/**
 * Our drivers as a table, for a location's Drivers tab and the list across
 * locations: the name and phone, the classes they may drive, the location
 * where the list spans several, the licences due, and whether they are
 * active. Each opens inside its location.
 */
export function DriversTable({
  drivers,
  showLocation = false,
  emptyMessage,
}: {
  drivers: DriverWithClasses[];
  showLocation?: boolean;
  emptyMessage: string;
}) {
  const columns = showLocation ? 5 : 4;
  return (
    <Table>
      <THead>
        <Th>Driver</Th>
        <Th>May drive</Th>
        {showLocation ? <Th>Based at</Th> : null}
        <Th>Licences</Th>
        <Th>Status</Th>
      </THead>
      <TBody>
        {drivers.length === 0 ? (
          <EmptyRow colSpan={columns}>{emptyMessage}</EmptyRow>
        ) : (
          drivers.map((driver) => (
            <tr
              key={driver.id}
              className={driver.isActive ? undefined : "text-slate-500"}
            >
              <Td className="whitespace-nowrap">
                <Link
                  href={locationDriverHref(driver.location.slug, driver.id)}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {driver.name}
                </Link>
                <span className="block text-xs text-slate-500 tabular-nums">
                  {driver.phone}
                  {driver.vendor && !driver.vendor.isOurs
                    ? ` · ${driver.vendor.name}`
                    : null}
                </span>
              </Td>
              <Td className="min-w-40 text-slate-600">
                {driver.vehicleClasses.map((c) => c.name).join(", ")}
              </Td>
              {showLocation ? (
                <Td className="whitespace-nowrap text-slate-600">
                  {driver.location.name}
                </Td>
              ) : null}
              <Td className="min-w-56">
                {driver.isActive ? (
                  <DocumentsDue
                    due={driverDocumentsDue(driver)}
                    anyEntered={DRIVER_DOCUMENTS.some((key) => driver[key])}
                  />
                ) : (
                  <span className="text-slate-500">Not checked</span>
                )}
              </Td>
              <Td className="whitespace-nowrap">
                <Badge tone={driver.isActive ? "green" : "neutral"}>
                  {driver.isActive ? "Active" : "Inactive"}
                </Badge>
              </Td>
            </tr>
          ))
        )}
      </TBody>
    </Table>
  );
}
