import Link from "next/link";
import {
  formatLocalDate,
  formatLocalTime,
  isTripEventKind,
  TRIP_EVENT_LABELS,
} from "@repo/db";
import {
  listDriverJobs,
  listVendorJobs,
  listVendorOffers,
  type DriverTrip,
  type VendorTrip,
} from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Card, CardTitle } from "@repo/console/Card";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { AccessScreen } from "./_components/AccessScreen";
import { ConnectShell } from "./_components/ConnectShell";
import { OfferCard } from "./_components/OfferCard";
import { VendorOfferCard } from "./_components/VendorOfferCard";
import {
  memberOf,
  requireSignedIn,
  shellMember,
  type LetIn,
  type MemberAccess,
} from "./_lib/access";

/**
 * Route: /. Who is signed in decides the screen: why Connect is shut to
 * them; a vendor's work for its owner and staff, the offers waiting for
 * its yes and the jobs it accepted; and a driver's own, the offers
 * waiting for their yes, today's jobs, those coming up and those done
 * lately. A one-person vendor sees both. See
 * docs/261028-fulfilment-vendors-and-connect.md, "What people see in
 * Connect".
 */
export default async function HomePage() {
  const access = await requireSignedIn();
  if (access.status !== "ok") {
    return (
      <ConnectShell>
        <AccessScreen access={access} />
      </ConnectShell>
    );
  }
  const member = memberOf(access);
  return (
    <ConnectShell member={shellMember(member)}>
      {member ? (
        <Streamed fallback={<CardSkeleton rows={3} />}>
          {() => vendorScreen(member)}
        </Streamed>
      ) : null}
      {access.driver ? (
        <Streamed fallback={<CardSkeleton rows={3} />}>
          {() => driverScreen(access.driver!, member !== null)}
        </Streamed>
      ) : null}
    </ConnectShell>
  );
}

async function vendorScreen(member: MemberAccess) {
  const [offers, jobs] = await Promise.all([
    listVendorOffers(member.vendor.id, member.user.id),
    listVendorJobs(member.vendor.id),
  ]);
  const empty = offers.length + jobs.coming.length + jobs.done.length === 0;
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {member.vendor.name}
        </h1>
        <p className="text-slate-600">
          The jobs we offer you, and those you accepted.
        </p>
      </div>
      {empty ? (
        <Card>
          <p className="text-slate-600">
            No job yet. Add your vehicles and drivers, and the jobs we offer you
            show here to accept.
          </p>
        </Card>
      ) : null}
      {offers.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Offers</h2>
          {offers.map((offer) => (
            <VendorOfferCard key={offer.offerId} offer={offer} />
          ))}
        </section>
      ) : null}
      <JobList title="Accepted" trips={jobs.coming} />
      <JobList title="Done" trips={jobs.done} />
    </>
  );
}

async function driverScreen(
  driver: NonNullable<LetIn["driver"]>,
  alsoMember: boolean,
) {
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
        {alsoMember ? (
          <h2 className="text-xl font-semibold tracking-tight">
            Your own driving
          </h2>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">
            Hi {driver.name.split(" ")[0]}
          </h1>
        )}
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

function JobList({
  title,
  trips,
}: {
  title: string;
  trips: (DriverTrip | VendorTrip)[];
}) {
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
                  {"vehicle" in trip
                    ? ` · ${trip.vehicle ?? "No vehicle"}, ${trip.driver ?? "no driver"}${trip.driver && !trip.driverAccepted ? " (to accept)" : ""}`
                    : ""}
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
