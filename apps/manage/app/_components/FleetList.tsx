import { driverDocumentsDue, plural, vehicleDocumentsDue } from "@repo/db";
import {
  listDrivers,
  listVehicles,
  type DriverWithClasses,
  type FleetFilter,
  type ListedVehicle,
} from "@repo/db/server";
import { Card } from "@repo/console/Card";
import { FigureStrip, type Figure } from "@repo/console/FigureTiles";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import {
  driversHref,
  vehiclesHref,
  type FleetListFilter,
} from "../_lib/routes";
import type { ConsoleScope } from "../_lib/scope";
import { DriversTable } from "./DriversTable";
import { DueFilter } from "./DueFilter";
import { SearchBox } from "./SearchBox";
import { VehiclesTable } from "./VehiclesTable";
import { ListToolbar } from "./ListToolbar";

/**
 * How each list names its records, their standing and the documents it
 * watches, how many columns its table has under a location (`~` adds the
 * location's), and its address.
 */
const KINDS = {
  vehicles: {
    one: "vehicle",
    active: "In service",
    inactive: "Out of service",
    due: "Documents due",
    expired: "Document expired",
    dueEmpty: "has a document due",
    search: "Plate, brand or model",
    columns: 5,
    href: vehiclesHref,
  },
  drivers: {
    one: "driver",
    active: "Active",
    inactive: "Inactive",
    due: "Licences due",
    expired: "Licence expired",
    dueEmpty: "has a licence due",
    search: "Name or phone",
    columns: 4,
    href: driversHref,
  },
} as const;

type FleetKind = keyof typeof KINDS;

/** The rows of one list, by its kind. */
type Listed =
  | { kind: "vehicles"; rows: ListedVehicle[] }
  | { kind: "drivers"; rows: DriverWithClasses[] };

async function read(kind: FleetKind, filter: FleetFilter): Promise<Listed> {
  return kind === "vehicles"
    ? { kind, rows: await listVehicles(filter) }
    : { kind, rows: await listDrivers(filter) };
}

/**
 * How many of a list are in service and out, and of those in service how
 * many have a document due and how many one expired, each counted once,
 * by its worst.
 */
type Counts = {
  active: number;
  inactive: number;
  due: number;
  expired: number;
};

function countsOf(listed: Listed): Counts {
  const rows =
    listed.kind === "vehicles"
      ? listed.rows.map((v) => ({
          isActive: v.isActive,
          due: vehicleDocumentsDue(v),
        }))
      : listed.rows.map((d) => ({
          isActive: d.isActive,
          due: driverDocumentsDue(d),
        }));
  const active = rows.filter((row) => row.isActive);
  const expired = active.filter((row) =>
    row.due.some((document) => document.state === "expired"),
  ).length;
  return {
    active: active.length,
    inactive: rows.length - active.length,
    due: active.filter((row) => row.due.length > 0).length - expired,
    expired,
  };
}

/** The counts as the strip shows them, amber and red only when there are some; bones while they load. */
function figuresOf(kind: FleetKind, counts: Counts | null): Figure[] {
  const names = KINDS[kind];
  const value = (n: number | undefined) => n ?? <Bone className="h-7 w-8" />;
  return [
    {
      key: "active",
      label: names.active,
      value: value(counts?.active),
      tone: "green",
    },
    {
      key: "inactive",
      label: names.inactive,
      value: value(counts?.inactive),
      tone: "neutral",
    },
    {
      key: "due",
      label: names.due,
      value: value(counts?.due),
      tone: counts?.due ? "amber" : "neutral",
    },
    {
      key: "expired",
      label: names.expired,
      value: value(counts?.expired),
      tone: counts?.expired ? "red" : "neutral",
    },
  ];
}

/**
 * Our vehicles or our drivers in the scope: every location's under `~`,
 * with a column of locations, or those based at one location. A strip of
 * figures sums up the scope; under it, in one card, the search, the
 * filter to those with a document due, and the table, with how many it
 * shows at its foot. The figures count the whole scope, whatever the
 * filters.
 */
export function FleetList({
  kind,
  scope,
  filter,
}: {
  kind: FleetKind;
  scope: ConsoleScope;
  filter: FleetListFilter;
}) {
  const names = KINDS[kind];
  const { due = false, q } = filter;
  const across = scope.slug === null;
  const locationId = scope.location?.id;
  const hrefOf = (next: FleetListFilter) => names.href(scope.slug, next);
  // One read serves the figures and, unfiltered, the table.
  const everyOne = read(kind, { locationId });
  const shown =
    due || q ? read(kind, { locationId, due, search: q }) : everyOne;
  const empty = q
    ? `No ${names.one} matches “${q}”.`
    : due
      ? `No ${names.one}${across ? "" : " here"} ${names.dueEmpty}.`
      : across
        ? `No ${names.one} yet.`
        : `No ${names.one} based here yet.`;
  const where = scope.location ? ` at ${scope.location.name}` : "";

  return (
    <>
      <Streamed
        fallback={
          <FigureStrip
            label={`Our ${kind}${where}`}
            figures={figuresOf(kind, null)}
          />
        }
      >
        {async () => (
          <FigureStrip
            label={`Our ${kind}${where}`}
            figures={figuresOf(kind, countsOf(await everyOne))}
          />
        )}
      </Streamed>
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={hrefOf({ due })}
            value={q ?? ""}
            label={`Search ${kind}`}
            placeholder={names.search}
          />
          <DueFilter
            label={names.due}
            due={due}
            href={hrefOf({ due: !due, q })}
          />
        </ListToolbar>
        <Streamed
          key={`${due}:${q ?? ""}`}
          fallback={
            <TableSkeleton bare columns={names.columns + Number(across)} />
          }
        >
          {async () => {
            const [listed, total] = await Promise.all([shown, everyOne]);
            const count = listed.rows.length;
            return (
              <>
                {listed.kind === "vehicles" ? (
                  <VehiclesTable
                    vehicles={listed.rows}
                    scope={scope.slug}
                    bare
                    emptyMessage={empty}
                  />
                ) : (
                  <DriversTable
                    drivers={listed.rows}
                    scope={scope.slug}
                    bare
                    emptyMessage={empty}
                  />
                )}
                {count > 0 ? (
                  <p className="border-t border-hairline px-5 py-3 text-caption text-muted tabular-nums">
                    {count === total.rows.length
                      ? plural(count, names.one)
                      : `${count} of ${plural(total.rows.length, names.one)}`}
                    {where}
                  </p>
                ) : null}
              </>
            );
          }}
        </Streamed>
      </Card>
    </>
  );
}
