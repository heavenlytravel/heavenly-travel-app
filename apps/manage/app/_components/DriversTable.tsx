import { DRIVER_DOCUMENTS, driverDocumentsDue } from "@repo/db";
import type { DriverWithClasses } from "@repo/db/server";
import { driverHref, type ScopeSlug } from "../_lib/routes";
import { DocumentsDue } from "@repo/console/DocumentsDue";
import type { MadeSort } from "./AddedColumn";
import { PeopleTable } from "./PeopleTable";

/**
 * The drivers as a table (./PeopleTable), with the classes they may
 * drive and, after the location, the licences due.
 */
export function DriversTable({
  drivers,
  ...table
}: {
  drivers: readonly DriverWithClasses[];
  scope: ScopeSlug;
  sort?: MadeSort;
  bare?: boolean;
  emptyMessage: string;
}) {
  return (
    <PeopleTable
      {...table}
      people={drivers}
      hrefOf={driverHref}
      heading="Driver"
      lead={[
        {
          heading: "May drive",
          cell: (driver) => driver.vehicleClasses.map((c) => c.name).join(", "),
          className: "min-w-40",
        },
      ]}
      trail={[
        {
          heading: "Licences",
          cell: (driver) =>
            driver.isActive ? (
              <DocumentsDue
                due={driverDocumentsDue(driver)}
                anyEntered={DRIVER_DOCUMENTS.some((key) => driver[key])}
              />
            ) : (
              <span className="text-muted">Not checked</span>
            ),
          className: "min-w-56",
        },
      ]}
    />
  );
}
