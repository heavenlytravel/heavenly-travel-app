import {
  driverDocumentsDue,
  isMadeOrder,
  plural,
  searchTermOf,
  textOf,
  vehicleDocumentsDue,
  type MadeOrder,
} from "@repo/db";
import {
  listClassOptions,
  listDrivers,
  listGuides,
  listVehicles,
  listVendorOptions,
  type DriverWithClasses,
  type FleetFilter,
  type GuideWithVendor,
  type ListedVehicle,
} from "@repo/db/server";
import { Card } from "@repo/console/Card";
import { FigureTiles, type Figure } from "@repo/console/FigureTiles";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import {
  DUE_PARAM,
  isFleetService,
  SEARCH_PARAM,
  SORT_PARAM,
  driversHref,
  guidesHref,
  vehiclesHref,
  type FleetListFilter,
} from "../_lib/routes";
import type { ConsoleScope } from "../_lib/scope";
import { DriversTable } from "./DriversTable";
import { GuidesTable } from "./GuidesTable";
import { SearchBox } from "./SearchBox";
import { VehiclesTable } from "./VehiclesTable";
import { ListToolbar } from "./ListToolbar";
import { FilterChips, ListFilters, type FilterGroup } from "./ListFilters";

/**
 * How each list names its records, their standing and the documents it
 * watches, how many columns its table has under a location (`~` adds the
 * location's), and its address. Tour guides' licences are kept, not
 * watched: their list has no due figures or filter.
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
  guides: {
    one: "tour guide",
    active: "Active",
    inactive: "Inactive",
    due: null,
    expired: null,
    dueEmpty: null,
    search: "Name, phone or language",
    columns: 3,
    href: guidesHref,
  },
} as const;

type FleetKind = keyof typeof KINDS;

/** The rows of one list, by its kind. */
type Listed =
  | { kind: "vehicles"; rows: ListedVehicle[] }
  | { kind: "drivers"; rows: DriverWithClasses[] }
  | { kind: "guides"; rows: GuideWithVendor[] };

/**
 * A fleet list's filter as its address holds it, every field checked: an
 * unknown value is no filter. The three list pages read theirs with it.
 */
export function fleetListFilterOf(
  query: Record<string, string | string[] | undefined>,
): FleetListFilter {
  return {
    due: query.due === DUE_PARAM || undefined,
    service: isFleetService(query.service) ? query.service : undefined,
    vendor: textOf(query.vendor) || undefined,
    vehicleClass: textOf(query.class) || undefined,
    q: searchTermOf(query[SEARCH_PARAM]) ?? undefined,
    sort: madeOrderOf(query[SORT_PARAM]),
  };
}

/** The order by when each was added the address holds; none for an unknown one. */
function madeOrderOf(value: unknown) {
  const sort = textOf(value);
  return isMadeOrder(sort) ? sort : undefined;
}

async function read(
  kind: FleetKind,
  filter: FleetFilter & { vehicleClassId?: string },
): Promise<Listed> {
  switch (kind) {
    case "vehicles":
      return { kind, rows: await listVehicles(filter) };
    case "drivers":
      return { kind, rows: await listDrivers(filter) };
    case "guides":
      return { kind, rows: await listGuides(filter) };
  }
}

/**
 * How many of a list are in service and out, and of those in service how
 * many have a document due and how many one expired, each counted once,
 * by its worst; none due for tour guides.
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
      : listed.kind === "drivers"
        ? listed.rows.map((d) => ({
            isActive: d.isActive,
            due: driverDocumentsDue(d),
          }))
        : listed.rows.map((g) => ({ isActive: g.isActive, due: [] }));
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

/** The counts as the tiles show them, amber and red only when there are some; bones while they load. */
function figuresOf(kind: FleetKind, counts: Counts | null): Figure[] {
  const names = KINDS[kind];
  const value = (n: number | undefined) => n ?? <Bone className="h-7 w-8" />;
  const standing: Figure[] = [
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
  ];
  if (names.due === null || names.expired === null) return standing;
  return [
    ...standing,
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
 * Our vehicles, our drivers or the tour guides in the scope: every location's under `~`,
 * with a column of locations, or those based at one location. Tiles of
 * figures sum up the scope; under it, in one card, the search, the
 * console's Filters button (in service or out, documents due, class,
 * vendor) with a chip for each in force, and the table, sorted by its
 * own order or by when each was added, with how many it shows at its
 * foot. The figures count the whole scope, whatever the filters.
 */
export async function FleetList({
  kind,
  scope,
  filter,
}: {
  kind: FleetKind;
  scope: ConsoleScope;
  filter: FleetListFilter;
}) {
  const names = KINDS[kind];
  const { q, service } = filter;
  const order = madeOrderOf(filter.sort);
  const due = names.due !== null && (filter.due ?? false);
  const across = scope.slug === null;
  const locationId = scope.location?.id;
  const hrefOf = (next: FleetListFilter) => names.href(scope.slug, next);
  const [vendors, classes] = await Promise.all([
    listVendorOptions(),
    kind === "vehicles" ? listClassOptions() : Promise.resolve([]),
  ]);
  // A vendor or class no longer listed is no filter, as any unknown value is.
  const vendor = vendors.some((v) => v.id === filter.vendor)
    ? filter.vendor
    : undefined;
  const vehicleClass = classes.some((c) => c.id === filter.vehicleClass)
    ? filter.vehicleClass
    : undefined;
  const live: FleetListFilter = {
    due: due || undefined,
    service,
    vendor,
    vehicleClass,
    q,
    sort: order,
  };
  // One read serves the figures and, unfiltered, the table.
  const everyOne = read(kind, { locationId });
  const inDb = Boolean(due || q || vendor || vehicleClass || order);
  const shown = (
    inDb
      ? read(kind, {
          locationId,
          due,
          search: q,
          vendorId: vendor,
          vehicleClassId: vehicleClass,
          order,
        })
      : everyOne
  ).then((listed) => inService(listed, service));
  const narrowedBeyondDue = Boolean(vendor || vehicleClass || service);
  const empty = q
    ? `No ${names.one} matches “${q}”.`
    : narrowedBeyondDue
      ? `No ${names.one} matches these filters.`
      : due && names.dueEmpty
        ? `No ${names.one}${across ? "" : " here"} ${names.dueEmpty}.`
        : across
          ? `No ${names.one} yet.`
          : `No ${names.one} based here yet.`;
  const groups: FilterGroup[] = [
    {
      param: "service",
      label: "Standing",
      value: service ?? "",
      options: [
        { value: "active", label: names.active },
        { value: "inactive", label: names.inactive },
      ],
    },
    ...(names.due
      ? [
          {
            param: "due",
            label: names.due,
            value: due ? DUE_PARAM : "",
            options: [{ value: DUE_PARAM, label: "Due soon or expired" }],
          },
        ]
      : []),
    ...(kind === "vehicles"
      ? [
          {
            param: "class",
            label: "Class",
            value: vehicleClass ?? "",
            options: classes.map((c) => ({ value: c.id, label: c.name })),
          },
        ]
      : []),
    {
      param: "vendor",
      label: "Vendor",
      value: vendor ?? "",
      options: vendors.map((v) => ({ value: v.id, label: v.name })),
    },
  ];
  const listed = hrefOf(live);
  const sort = {
    order,
    hrefOf: (next: MadeOrder) => hrefOf({ ...live, sort: next }),
  };
  const where = scope.location ? ` at ${scope.location.name}` : "";

  return (
    <>
      <Streamed
        fallback={
          <FigureTiles
            label={`Our ${kind}${where}`}
            figures={figuresOf(kind, null)}
          />
        }
      >
        {async () => (
          <FigureTiles
            label={`Our ${kind}${where}`}
            figures={figuresOf(kind, countsOf(await everyOne))}
          />
        )}
      </Streamed>
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={hrefOf({ ...live, q: undefined })}
            value={q ?? ""}
            label={`Search ${kind}`}
            placeholder={names.search}
          />
          <ListFilters href={listed} groups={groups} />
        </ListToolbar>
        <FilterChips href={listed} groups={groups} />
        <Streamed
          key={listed}
          fallback={
            <TableSkeleton bare columns={names.columns + 1 + Number(across)} />
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
                    sort={sort}
                    bare
                    emptyMessage={empty}
                  />
                ) : listed.kind === "drivers" ? (
                  <DriversTable
                    drivers={listed.rows}
                    scope={scope.slug}
                    sort={sort}
                    bare
                    emptyMessage={empty}
                  />
                ) : (
                  <GuidesTable
                    guides={listed.rows}
                    scope={scope.slug}
                    sort={sort}
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

/** The rows in service, or out of it; all of them without `service`. */
function inService(
  listed: Listed,
  service: FleetListFilter["service"],
): Listed {
  if (!service) return listed;
  const keep = service === "active";
  switch (listed.kind) {
    case "vehicles":
      return {
        ...listed,
        rows: listed.rows.filter((r) => r.isActive === keep),
      };
    case "drivers":
      return {
        ...listed,
        rows: listed.rows.filter((r) => r.isActive === keep),
      };
    case "guides":
      return {
        ...listed,
        rows: listed.rows.filter((r) => r.isActive === keep),
      };
  }
}
