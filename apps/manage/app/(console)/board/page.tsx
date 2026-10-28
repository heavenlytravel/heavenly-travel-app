import Link from "next/link";
import {
  BOARD_COLUMNS,
  BOARD_COLUMN_LABELS,
  dateOfDay,
  dayOf,
  formatLocalDate,
  formatLocalTime,
  isDay,
  PART_ROLE_LABELS,
  todayInMalaysia,
  type PartRole,
} from "@repo/db";
import {
  listBoard,
  listOursToAccept,
  type BoardCard,
  type BoardPart,
} from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { cx } from "@repo/ui/cx";
import { Card, CardTitle } from "../../_components/Card";
import { FilterSelect } from "../../_components/FilterSelect";
import { PageHeader } from "../../_components/PageHeader";
import { CardSkeleton, Streamed } from "../../_components/Skeleton";
import { requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/filter-options";
import { locationNames } from "../../_lib/location-names";
import { boardHref, bookingHref } from "../../_lib/routes";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The day before or after, "2026-11-03". */
const dayFrom = (day: string, days: number) =>
  dayOf(new Date(dateOfDay(day)!.getTime() + days * DAY_MS))!;

/**
 * Route: /board?day=2026-11-03&location=…. Operation's board: a day's
 * trips in the column each stands in, To assign, Waiting to accept,
 * Assigned, On the road and Done, worked out from its status and who was
 * asked, at one location or every one; and, above them, our vehicles
 * waiting for Operation's own yes. For watching: a card moves when a
 * vendor or a driver acts, and opens its booking, where it is assigned.
 * See docs/261028-fulfilment-vendors-and-connect.md, "The booking's life".
 */
export default async function BoardPage({ searchParams }: PageProps<"/board">) {
  await requireAdmin("bookings.fulfil");
  const params = await searchParams;
  const today = todayInMalaysia();
  const day =
    typeof params.day === "string" && isDay(params.day) ? params.day : today;
  const location =
    typeof params.location === "string" && params.location
      ? params.location
      : undefined;
  const locations = await locationNames();

  return (
    <>
      <PageHeader
        title="Board"
        description="A day's trips by where they stand. Open one to assign it; a card moves when its vendor or driver answers."
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Day" className="flex items-center gap-1 text-sm">
          <DayLink href={boardHref({ day: dayFrom(day, -1), location })}>
            Previous day
          </DayLink>
          <span className="px-2 font-medium text-slate-900">
            {formatLocalDate(dateOfDay(day)!)}
            {day === today ? " (today)" : null}
          </span>
          <DayLink href={boardHref({ day: dayFrom(day, 1), location })}>
            Next day
          </DayLink>
          {day !== today ? (
            <DayLink href={boardHref({ location })}>Today</DayLink>
          ) : null}
        </nav>
        <FilterSelect
          label="Location"
          value={location ?? ""}
          options={locationFilterOptions(locations, (next) =>
            boardHref({ day: day === today ? undefined : day, location: next }),
          )}
        />
      </div>
      <div className="mt-6 grid gap-6">
        <Streamed
          fallback={
            <div className="grid gap-4 lg:grid-cols-5">
              {BOARD_COLUMNS.map((column) => (
                <CardSkeleton key={column} rows={2} />
              ))}
            </div>
          }
        >
          {() => board(day, location)}
        </Streamed>
      </div>
    </>
  );
}

function DayLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1 text-slate-600 underline-offset-4 hover:bg-slate-100 hover:underline"
    >
      {children}
    </Link>
  );
}

async function board(day: string, location: string | undefined) {
  const [cards, ours] = await Promise.all([
    listBoard(day, location),
    listOursToAccept(),
  ]);
  return (
    <>
      {ours.length > 0 ? (
        <Card>
          <CardTitle description="Our vehicles asked for and not yet checked. Open the booking to accept for us.">
            Waiting for Operation
          </CardTitle>
          <ul className="divide-y divide-slate-100 text-sm">
            {ours.map((part) => (
              <li
                key={`${part.reference}-${part.position}-${part.role}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <Link
                  href={bookingHref(part.bookingId)}
                  className="font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {part.reference}
                </Link>
                <span className="text-slate-600">
                  Trip {part.position}, {formatLocalDate(part.startsAt)}{" "}
                  {formatLocalTime(part.startsAt)}
                </span>
                <span className="text-slate-600">
                  {PART_ROLE_LABELS[part.role as PartRole] ?? part.role}
                  {part.name ? ` ${part.name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-5">
        {BOARD_COLUMNS.map((column) => {
          const inColumn = cards.filter((card) => card.column === column);
          return (
            <section
              key={column}
              aria-label={BOARD_COLUMN_LABELS[column]}
              className="grid min-w-0 gap-2 rounded-xl bg-slate-50 p-3"
            >
              <h2 className="flex items-center justify-between text-sm font-semibold text-slate-800">
                {BOARD_COLUMN_LABELS[column]}
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {inColumn.length}
                </span>
              </h2>
              {inColumn.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">None</p>
              ) : (
                inColumn.map((card) => (
                  <BoardCardView key={card.itemId} card={card} />
                ))
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/** What a part still waits for, in a few words. */
function waitingLabel(part: BoardPart) {
  switch (part.waiting) {
    case "name":
      return `Vendor to choose the ${part.role}`;
    case "vendor":
      return part.vendorName
        ? "Waiting for the vendor"
        : "Waiting for Operation";
    case "driver":
      return "Waiting for the driver";
    case null:
      return null;
  }
}

/** One trip: when, where, what, and who does it. Opens its booking. */
function BoardCardView({ card }: { card: BoardCard }) {
  const { job } = card;
  return (
    <Link
      href={bookingHref(card.bookingId)}
      className={cx(
        "grid gap-1 rounded-lg border bg-white p-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300",
        card.overdue ? "border-amber-300" : "border-slate-200",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums">
          {formatLocalTime(job.startsAt)}
        </span>
        <span className="text-xs text-slate-500 tabular-nums">
          {card.reference}
          {card.position > 1 ? ` · ${card.position}` : ""}
        </span>
      </span>
      <span className="text-slate-700">
        {job.dropoff
          ? `${job.pickup.label} → ${job.dropoff.label}`
          : job.pickup.label}
      </span>
      <span className="text-xs text-slate-500">
        {card.className} · {card.passengers} pax
        {card.locationName ? ` · ${card.locationName}` : ""}
      </span>
      {card.parts.map((part) => {
        const waiting = waitingLabel(part);
        return (
          <span key={part.role} className="text-xs text-slate-600">
            <span className="font-medium">
              {PART_ROLE_LABELS[part.role as PartRole] ?? part.role}:
            </span>{" "}
            {part.name ?? "not chosen yet"}
            {part.vendorName ? ` (${part.vendorName})` : ""}
            {waiting ? (
              <span className="block text-amber-700">{waiting}</span>
            ) : null}
          </span>
        );
      })}
      {card.overdue ? (
        <Badge tone="amber">Past its estimated end, no Dropped off yet</Badge>
      ) : null}
    </Link>
  );
}
