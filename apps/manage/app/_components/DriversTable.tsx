import Link from "next/link";
import { DRIVER_DOCUMENTS, driverDocumentsDue } from "@repo/db";
import type { DriverWithClasses } from "@repo/db/server";
import { driverHref, type ScopeSlug } from "../_lib/routes";
import { DocumentsDue } from "@repo/console/DocumentsDue";
import { ServiceBadge } from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";

/**
 * Our drivers as a table, in the scope on screen: the name and phone, the
 * classes they may drive, the location under `~`, the licences due, and
 * whether they are active. Each opens in the scope it was listed in.
 * `bare` is for a `flush` card.
 */
export function DriversTable({
  drivers,
  scope,
  bare = false,
  emptyMessage,
}: {
  drivers: readonly DriverWithClasses[];
  scope: ScopeSlug;
  bare?: boolean;
  emptyMessage: string;
}) {
  const showLocation = scope === null;
  const columns = showLocation ? 5 : 4;
  return (
    <Table bare={bare}>
      <THead>
        <Th>Driver</Th>
        <Th>May drive</Th>
        {showLocation ? <Th>Location</Th> : null}
        <Th>Licences</Th>
        <Th>Status</Th>
      </THead>
      <TBody>
        {drivers.length === 0 ? (
          <EmptyRow colSpan={columns}>{emptyMessage}</EmptyRow>
        ) : (
          drivers.map((driver) => (
            <tr key={driver.id}>
              <Td className="whitespace-nowrap">
                <TwoLines
                  top={
                    <Link
                      href={driverHref(scope, driver.id)}
                      className="underline-offset-4 hover:underline"
                    >
                      {driver.name}
                    </Link>
                  }
                  bottom={<span className="tabular-nums">{driver.phone}</span>}
                />
              </Td>
              <Td className="min-w-40">
                {driver.vehicleClasses.map((c) => c.name).join(", ")}
              </Td>
              {showLocation ? (
                <Td className="whitespace-nowrap">{driver.location.name}</Td>
              ) : null}
              <Td className="min-w-56">
                {driver.isActive ? (
                  <DocumentsDue
                    due={driverDocumentsDue(driver)}
                    anyEntered={DRIVER_DOCUMENTS.some((key) => driver[key])}
                  />
                ) : (
                  <span className="text-muted">Not checked</span>
                )}
              </Td>
              <Td className="whitespace-nowrap">
                <ServiceBadge
                  active={driver.isActive}
                  on="Active"
                  off="Inactive"
                />
              </Td>
            </tr>
          ))
        )}
      </TBody>
    </Table>
  );
}
