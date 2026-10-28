import Link from "next/link";
import {
  formatLocalDate,
  formatLocalTime,
  isTripEventKind,
  TRIP_EVENT_LABELS,
} from "@repo/db";
import { listDriverJobs, type DriverTrip } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Card, CardTitle } from "@repo/console/Card";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { AccessScreen } from "./_components/AccessScreen";
import { ConnectShell } from "./_components/ConnectShell";
import { OfferCard } from "./_components/OfferCard";
import { requireSignedIn, type LetIn } from "./_lib/access";

/**
 * Route: /. Who is signed in decides the screen: why Connect is shut to
 * them, or a driver's work: the offers waiting for their yes, today's
 * jobs, those coming up and those done lately. A vendor's own screens
 * come with step 5 of docs/261028-fulfilment-vendors-and-connect.md.
 */
export default async function HomePage() {
  const access = await requireSignedIn();
  return (
    <ConnectShell>
      {access.status !== "ok" ? (
        <AccessScreen access={access} />
      ) : access.driver ? (
        <Streamed fallback={<CardSkeleton rows={3} />}>
          {() => driverScreen(access.driver!)}
        </Streamed>
      ) : (
        <MemberScreen access={access} />
      )}
    </ConnectShell>
  );
}

/** A vendor's member who is not a driver: their vendor's screens come next. */
function MemberScreen({ access }: { access: LetIn }) {
  const names = access.memberships.map((m) => m.vendor.name).join(", ");
  return (
    <Card className="grid gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{names}</h1>
      <p className="text-slate-600">
        Your vendor is approved. Its offers, vehicles and drivers open here
        soon; until then, the team sends you jobs on WhatsApp.
      </p>
    </Card>
  );
}

async function driverScreen(driver: NonNullable<LetIn["driver"]>) {
  const jobs = await listDriverJobs(driver);
  const empty =
    jobs.offers.length +
      jobs.today.length +
      jobs.coming.length +
      jobs.done.length ===
    0;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi {driver.name.split(" ")[0]}
        </h1>
        <p className="text-slate-600">
          {driver.vendor.isOurs ? "Heavenly Travel" : driver.vendor.name}
        </p>
      </div>
      {empty ? (
        <Card>
          <p className="text-slate-600">
            No job yet. A job Operation gives you shows here to accept.
          </p>
        </Card>
      ) : null}
      {jobs.offers.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Offers</h2>
          {jobs.offers.map((offer) => (
            <OfferCard key={offer.offerId} offer={offer} />
          ))}
        </section>
      ) : null}
      <JobList title="Today" trips={jobs.today} />
      <JobList title="Coming up" trips={jobs.coming} />
      <JobList title="Done" trips={jobs.done} />
    </>
  );
}

function JobList({ title, trips }: { title: string; trips: DriverTrip[] }) {
  if (trips.length === 0) return null;
  return (
    <Card className="grid gap-1" flush>
      <CardTitle inset>{title}</CardTitle>
      <ul className="divide-y divide-slate-100">
        {trips.map((trip) => {
          const last = trip.events.at(-1);
          return (
            <li key={trip.itemId}>
              <Link
                href={`/jobs/${trip.itemId}`}
                className="grid gap-0.5 px-6 py-3 hover:bg-slate-50"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold tabular-nums">
                    {formatLocalDate(trip.startsAt)},{" "}
                    {formatLocalTime(trip.startsAt)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {trip.reference}
                  </span>
                </span>
                <span className="text-slate-700">
                  {trip.dropoffArea
                    ? `${trip.pickupArea} → ${trip.dropoffArea}`
                    : `${trip.pickupArea}, by the hour`}
                </span>
                <span className="text-sm text-slate-500">
                  {trip.className} · {trip.passengers} passengers
                </span>
                {last ? (
                  <span>
                    <Badge
                      tone={trip.status === "completed" ? "green" : "blue"}
                    >
                      {isTripEventKind(last.kind)
                        ? TRIP_EVENT_LABELS[last.kind]
                        : last.kind}{" "}
                      {formatLocalTime(last.at)}
                    </Badge>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
