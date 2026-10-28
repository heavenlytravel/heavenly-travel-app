import { listDrivers, listVehicles } from "@repo/db/server";
import type { ReactNode } from "react";
import type { FleetListFilter } from "../_lib/routes";
import { DriversTable } from "./DriversTable";
import { DueFilter } from "./DueFilter";
import { SearchBox } from "./SearchBox";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { VehiclesTable } from "./VehiclesTable";

/** What a fleet list narrows to, beside the location: the documents due, a search. */
type Filter = Omit<FleetListFilter, "location">;

/** How each list names its records and the documents it watches. */
const KINDS = {
  vehicles: {
    one: "vehicle",
    due: "Documents due",
    dueEmpty: "has a document due",
    search: "Plate, brand or model",
  },
  drivers: {
    one: "driver",
    due: "Licences due",
    dueEmpty: "has a licence due",
    search: "Name or phone",
  },
} as const;

/**
 * A list of our vehicles or our drivers, across locations or a
 * location's tab: the filter to those with a document due, the search,
 * and the table. `hrefOf` names the list with filters in its address;
 * `locationFilter` is the list across locations' choice of location.
 */
export function FleetList({
  kind,
  filter,
  hrefOf,
  locationId,
  across = false,
  locationFilter,
}: {
  kind: keyof typeof KINDS;
  filter: Filter;
  hrefOf: (filter: Filter) => string;
  /** The location the list is narrowed to, by its tab or by the filter. */
  locationId?: string;
  /** Across locations: the column of locations, and messages for every location. */
  across?: boolean;
  locationFilter?: ReactNode;
}) {
  const names = KINDS[kind];
  const { due = false, q } = filter;
  const empty = q
    ? `No ${names.one} matches “${q}”.`
    : due
      ? `No ${names.one}${across ? "" : " here"} ${names.dueEmpty}.`
      : across
        ? `No ${names.one} yet.`
        : `No ${names.one} based here yet.`;
  const where = { locationId, due, search: q };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DueFilter
          label={names.due}
          due={due}
          hrefOf={(next) => hrefOf({ due: next, q })}
        />
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <SearchBox
            href={hrefOf({ due })}
            value={q ?? ""}
            label={`Search ${kind}`}
            placeholder={names.search}
          />
          {locationFilter}
        </div>
      </div>
      <div className="mt-4">
        <Streamed
          key={`${locationId ?? "all"}:${due}:${q ?? ""}`}
          fallback={
            <TableSkeleton
              columns={(kind === "vehicles" ? 5 : 4) + Number(across)}
            />
          }
        >
          {async () =>
            kind === "vehicles" ? (
              <VehiclesTable
                showLocation={across}
                vehicles={await listVehicles(where)}
                emptyMessage={empty}
              />
            ) : (
              <DriversTable
                showLocation={across}
                drivers={await listDrivers(where)}
                emptyMessage={empty}
              />
            )
          }
        </Streamed>
      </div>
    </>
  );
}
