import Link from "next/link";
import {
  BOARD_COLUMNS,
  BOARD_COLUMN_LABELS,
  dateOfDay,
  dayOf,
  formatLocalDate,
  formatLocalTime,
  isDay,
  isTripEventKind,
  PART_ROLE_LABELS,
  todayInMalaysia,
  TRIP_EVENT_LABELS,
  type PartRole,
} from "@repo/db";
import {
  listBoard,
  listOursToAccept,
  type BoardCard,
  type BoardPart,
} from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { boardHref, bookingHref, type ScopeSlug } from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The day before or after, "2026-11-03". */
const dayFrom = (day: string, days: number) =>
  dayOf(new Date(dateOfDay(day)!.getTime() + days * DAY_MS))!;

/**
 * Route: /[location]/board?day=2026-11-03. Operation's board: a day's
 * trips in the column each stands in, To assign, Waiting to accept,
 * Assigned, On the road and Done, worked out from its status and who was
 * asked, at every location under `~` or at the one under its slug; and,
 * above them, our vehicles waiting for Operation's own yes. For watching: a card moves when a
 * vendor or a driver acts, and opens its booking, where it is assigned.
 * See docs/261028-fulfilment-vendors-and-connect.md, "The booking's life".
 */
export default async function BoardPage({
  params,
  searchParams,
}: PageProps<"/[location]/board">) {
  await requireAdmin("bookings.fulfil");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  const today = todayInMalaysia();
  const day =
    typeof query.day === "string" && isDay(query.day) ? query.day : today;
  const steps = [
    { label: "Previous day", day: dayFrom(day, -1) },
    { label: "Next day", day: dayFrom(day, 1) },
    ...(day === today ? [] : [{ label: "Today", day: undefined }]),
  ];

  return (
    <>
      <PageHeader
        title="Board"
        meta={`${formatLocalDate(dateOfDay(day)!)}${day === today ? ", today" : ""}`}
        action={
          <nav aria-label="Day" className="flex flex-wrap gap-2">
            {steps.map((step) => (
              <Button key={step.label} asChild variant="secondary" size="sm">
                <Link href={boardHref(scope.slug, step.day)}>{step.label}</Link>
              </Button>
            ))}
          </nav>
        }
      />
      <Streamed
        fallback={
          <div className="grid gap-4 lg:grid-cols-5">
            {BOARD_COLUMNS.map((column) => (
              <CardSkeleton key={column} rows={2} />
            ))}
          </div>
        }
      >
        {() => board(scope.slug, day, scope.location?.id)}
      </Streamed>
    </>
  );
}

async function board(
  scope: ScopeSlug,
  day: string,
  location: string | undefined,
) {
  const [cards, ours] = await Promise.all([
    listBoard(day, location),
    listOursToAccept(location),
  ]);
  return (
    <>
      {ours.length > 0 ? (
        <Card>
          <CardTitle description="Our vehicles asked for and not yet checked. Open the booking to accept for us.">
            Waiting for Operation
          </CardTitle>
          <ul className="divide-y divide-hairline text-sm">
            {ours.map((part) => (
              <li
                key={`${part.reference}-${part.position}-${part.role}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <Link
                  href={bookingHref(scope, part.bookingId)}
                  className="font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {part.reference}
                </Link>
                <span className="text-muted">
                  Trip {part.position}, {formatLocalDate(part.startsAt)}{" "}
                  {formatLocalTime(part.startsAt)}
                </span>
                <span className="text-muted">
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
              className="grid min-w-0 gap-2 rounded-card bg-shade p-3"
            >
              <h2 className="flex items-center justify-between text-sm font-semibold text-body">
                {BOARD_COLUMN_LABELS[column]}
                <span className="text-xs font-medium text-muted tabular-nums">
                  {inColumn.length}
                </span>
              </h2>
              {inColumn.length === 0 ? (
                <p className="py-2 text-xs text-muted">None</p>
              ) : (
                inColumn.map((card) => (
                  <BoardCardView key={card.itemId} card={card} scope={scope} />
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
function BoardCardView({ card, scope }: { card: BoardCard; scope: ScopeSlug }) {
  const { job } = card;
  return (
    <Link
      href={bookingHref(scope, card.bookingId)}
      className={cx(
        "grid gap-1 rounded-control border bg-white p-3 text-sm shadow-card focus-ring hover:border-edge",
        card.overdue ? "border-warning-edge" : "border-card-edge",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums">
          {formatLocalTime(job.startsAt)}
        </span>
        <span className="text-xs text-muted tabular-nums">
          {card.reference}
          {card.position > 1 ? ` · ${card.position}` : ""}
        </span>
      </span>
      <span className="text-body">
        {job.dropoff
          ? `${job.pickup.label} → ${job.dropoff.label}`
          : job.pickup.label}
      </span>
      <span className="text-xs text-muted">
        {card.className} · {card.passengers} pax
        {scope === null && card.locationName ? ` · ${card.locationName}` : ""}
      </span>
      {card.parts.map((part) => {
        const waiting = waitingLabel(part);
        return (
          <span key={part.role} className="text-xs text-muted">
            <span className="font-medium">
              {PART_ROLE_LABELS[part.role as PartRole] ?? part.role}:
            </span>{" "}
            {part.name ?? "not chosen yet"}
            {part.vendorName ? ` (${part.vendorName})` : ""}
            {waiting ? (
              <span className="block text-warning">{waiting}</span>
            ) : null}
          </span>
        );
      })}
      {card.lastEvent ? (
        <span className="text-xs text-muted">
          <span className="font-medium">
            {isTripEventKind(card.lastEvent.kind)
              ? TRIP_EVENT_LABELS[card.lastEvent.kind]
              : card.lastEvent.kind}
          </span>{" "}
          at {formatLocalTime(card.lastEvent.at)}
        </span>
      ) : null}
      {card.overdue ? (
        <Badge tone="amber">Past its estimated end, no Dropped off yet</Badge>
      ) : null}
    </Link>
  );
}
