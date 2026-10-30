import {
  andList,
  driverDocumentsDue,
  expiryText,
  modelName,
  plural,
  vehicleDocumentsDue,
  type DocumentDue,
  type ExpiryState,
} from "@repo/db";
import {
  listDrivers,
  listVehicles,
  type LocationOverview,
} from "@repo/db/server";
import {
  CheckIcon,
  IdCardIcon,
  InboxIcon,
  TriangleAlertIcon,
} from "@repo/ui/icons";
import type { ReactNode } from "react";
import { Card, CardRows, CardTitle } from "@repo/console/Card";
import {
  bookingsHref,
  driverHref,
  driversHref,
  vehicleHref,
  vehiclesHref,
} from "../../../_lib/routes";
import { ActionRow, IconMark, RowEnd } from "./ActionRow";
import {
  AWAITING_DRIVER,
  DRIVERS_DUE,
  RECEIVED,
  VEHICLES_DUE,
  mayIn,
  splitOf,
  sumOf,
  type Day,
} from "./day";

/** One thing that waits on the admin. */
export type Need = {
  key: string;
  /** Red for a real problem, an expired document; amber for what waits. */
  tone: "red" | "amber";
  icon: ReactNode;
  title: string;
  line: string;
  href: string;
  /** "Open" for one record, "Review" for a list. */
  verb: string;
};

/** A vehicle or a driver with documents due, as a line of Needs you names it. */
type DueRecord = {
  name: string;
  /** What else to know: its model, where it is based under `~`. */
  about: string[];
  href: string;
  documents: DocumentDue[];
};

/** How Needs you words the documents of a vehicle, or a driver's licences. */
type DueWords = {
  /** "Insurance expired on KV7710", "Driving licence due for Aminah". */
  on: string;
  document: string;
  documents: string;
  one: string;
  many: string;
};

const VEHICLE_WORDS: DueWords = {
  on: "on",
  document: "document",
  documents: "documents",
  one: "vehicle",
  many: "vehicles",
};

const DRIVER_WORDS: DueWords = {
  on: "for",
  document: "licence",
  documents: "licences",
  one: "driver",
  many: "drivers",
};

/** A few names, then how many more: "KV7710, KV589E and 3 more". */
function namesOf(names: readonly string[]) {
  return names.length <= 3
    ? andList(names)
    : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

/**
 * The records with a document in this state as one line of Needs you:
 * one record by its name and document, opening it; several by how many,
 * opening the list of the documents due. Nothing when there are none.
 */
function documentsNeed({
  key,
  records,
  state,
  words,
  listHref,
  now,
}: {
  key: string;
  records: readonly DueRecord[];
  state: Exclude<ExpiryState, "valid">;
  words: DueWords;
  listHref: string;
  now: Date;
}): Need | null {
  const [record] = records;
  if (!record) return null;
  const expired = state === "expired";
  const base = {
    key,
    tone: expired ? ("red" as const) : ("amber" as const),
    icon: <TriangleAlertIcon />,
  };
  if (records.length > 1) {
    return {
      ...base,
      title: expired
        ? `${plural(records.length, words.one, words.many)} have an expired ${words.document}`
        : `${plural(records.length, words.one, words.many)} have a ${words.document} due`,
      line: namesOf(records.map((entry) => entry.name)),
      href: listHref,
      verb: "Review",
    };
  }
  const documents = record.documents.filter(
    (document) => document.state === state,
  );
  const [first] = documents;
  if (!first) return null;
  const what =
    documents.length === 1
      ? first.label
      : `${documents.length} ${words.documents}`;
  return {
    ...base,
    title: `${what} ${expired ? "expired" : "due"} ${words.on} ${record.name}`,
    line: [
      ...record.about,
      expiryText(first.expiresOn, now).toLowerCase(),
    ].join(" · "),
    href: record.href,
    verb: "Open",
  };
}

/** The records split by their worst document: those with one expired, and those with one due and none expired. */
function byWorst(records: readonly DueRecord[]) {
  const expired = records.filter((record) =>
    record.documents.some((document) => document.state === "expired"),
  );
  const due = records.filter(
    (record) =>
      !expired.includes(record) &&
      record.documents.some((document) => document.state === "due"),
  );
  return { expired, due };
}

/**
 * What waits on the admin in the scope, worst first: vehicles and
 * drivers with a document expired, the bookings received, the trips
 * awaiting a driver, then the documents due. Each only while it counts
 * any, and only for the teams that may open where it leads: the queue's
 * for the teams that work it, the fleet's for Operation.
 */
export async function needsOf(
  { scope, permissions, now }: Day,
  overviews: readonly LocationOverview[],
): Promise<Need[]> {
  const may = mayIn(permissions);
  const fleet = may("fleet.manage");
  const queue = may("bookings.view");
  const here = new Set(overviews.map((overview) => overview.id));
  const everywhere = scope.slug === null;
  const locationId = scope.location?.id;
  const [vehicles, drivers] = await Promise.all([
    fleet && sumOf(overviews, VEHICLES_DUE) > 0
      ? listVehicles({ locationId, due: true })
      : [],
    fleet && sumOf(overviews, DRIVERS_DUE) > 0
      ? listDrivers({ locationId, due: true })
      : [],
  ]);

  const vehicleRecords = byWorst(
    vehicles
      .filter((vehicle) => here.has(vehicle.locationId))
      .map((vehicle) => ({
        name: vehicle.plate,
        about: [
          modelName(vehicle.vehicleModel),
          ...(everywhere ? [vehicle.location.name] : []),
        ],
        href: vehicleHref(scope.slug, vehicle.id),
        documents: vehicleDocumentsDue(vehicle, now),
      })),
  );
  const driverRecords = byWorst(
    drivers
      .filter((driver) => here.has(driver.locationId))
      .map((driver) => ({
        name: driver.name,
        about: everywhere ? [driver.location.name] : [],
        href: driverHref(scope.slug, driver.id),
        documents: driverDocumentsDue(driver, now),
      })),
  );
  const vehicleList = vehiclesHref(scope.slug, { due: true });
  const driverList = driversHref(scope.slug, { due: true });

  const received = sumOf(overviews, RECEIVED);
  const awaitingDriver = sumOf(overviews, AWAITING_DRIVER);
  const needs: (Need | null)[] = [
    documentsNeed({
      key: "vehicles-expired",
      records: vehicleRecords.expired,
      state: "expired",
      words: VEHICLE_WORDS,
      listHref: vehicleList,
      now,
    }),
    documentsNeed({
      key: "drivers-expired",
      records: driverRecords.expired,
      state: "expired",
      words: DRIVER_WORDS,
      listHref: driverList,
      now,
    }),
    queue && received > 0
      ? {
          key: "received",
          tone: "amber",
          icon: <InboxIcon />,
          title: `${plural(received, "booking")} received`,
          line: splitOf(overviews, RECEIVED) ?? "Waiting to be confirmed",
          href: bookingsHref(scope.slug, { status: "received" }),
          verb: "Review",
        }
      : null,
    queue && awaitingDriver > 0
      ? {
          key: "driver",
          tone: "amber",
          icon: <IdCardIcon />,
          title: `${plural(awaitingDriver, "trip")} ${awaitingDriver === 1 ? "awaits" : "await"} a driver`,
          line:
            splitOf(overviews, AWAITING_DRIVER) ??
            "Confirmed, with no driver yet",
          href: bookingsHref(scope.slug, { status: "confirmed" }),
          verb: "Review",
        }
      : null,
    documentsNeed({
      key: "vehicles-due",
      records: vehicleRecords.due,
      state: "due",
      words: VEHICLE_WORDS,
      listHref: vehicleList,
      now,
    }),
    documentsNeed({
      key: "drivers-due",
      records: driverRecords.due,
      state: "due",
      words: DRIVER_WORDS,
      listHref: driverList,
      now,
    }),
  ];
  return needs.filter((need) => need !== null);
}

/** What waits on the admin, worst first, or that nothing does. */
export function NeedsYou({ needs }: { needs: readonly Need[] }) {
  return (
    <Card flush className="overflow-hidden">
      <CardTitle inset meta={needs.length > 1 ? "Worst first" : undefined}>
        Needs you
      </CardTitle>
      {needs.length === 0 ? (
        <p className="flex items-center gap-3 px-5 py-5 text-sm text-muted">
          <IconMark tone="green">
            <CheckIcon />
          </IconMark>
          Nothing waits on you right now.
        </p>
      ) : (
        <CardRows>
          {needs.map((need) => (
            <ActionRow
              key={need.key}
              href={need.href}
              mark={<IconMark tone={need.tone}>{need.icon}</IconMark>}
              title={need.title}
              line={need.line}
              end={<RowEnd verb={need.verb} />}
            />
          ))}
        </CardRows>
      )}
    </Card>
  );
}
