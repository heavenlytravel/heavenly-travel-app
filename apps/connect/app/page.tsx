import type { Metadata } from "next";
import { CONNECT_PAGE, sitePageFallbackTitle } from "@repo/db";
import {
  getConnectAccess,
  listDriverJobs,
  listDrivers,
  listVehicles,
  listVendorJobs,
  listVendorOffers,
  type DriverJobs,
  type DriverTrip,
} from "@repo/db/server";
import { CalendarCheckIcon, InboxIcon } from "@repo/ui/icons";
import { AccessScreen } from "./_components/AccessScreen";
import { Landing } from "./_landing/Landing";
import { landingData } from "./_landing/landing-data";
import { GettingStarted } from "./_components/GettingStarted";
import { OfferCard } from "./_components/OfferCard";
import { VendorOfferCard } from "./_components/VendorOfferCard";
import {
  memberOf,
  shellMember,
  type LetIn,
  type MemberAccess,
} from "./_lib/access";
import { tripStateOf } from "./_lib/trip-state";
import { greetingAt, longDayLabel } from "./_lib/when";
import { EmptyState, SectionTitle } from "./_ui/parts";
import { BandHeading, Screen } from "./_ui/Screen";
import { BandStats } from "./_ui/BandStats";
import { DoneTrips, NextJobCard, TripDays } from "./_ui/Trips";
import { WeekAhead } from "./_ui/WeekAhead";

/** The landing page's search title and description, for a visitor signed out. */
export async function generateMetadata(): Promise<Metadata> {
  const access = await getConnectAccess();
  if (access.status !== "signed-out") return {};
  const { content } = await landingData("public");
  return {
    title: content.metaTitle || sitePageFallbackTitle(CONNECT_PAGE),
    description: content.metaDescription,
  };
}

/**
 * Route: /. Who is visiting decides the screen: the landing page for a
 * visitor signed out; the status page of a registration waiting for
 * approval; why Connect is shut to them; a vendor's work for its owner and staff, the offers waiting for
 * its yes and the jobs it accepted; and a driver's own, the job that
 * matters now first, the offers waiting for their yes, today's jobs,
 * those coming up and those done lately. A one-person vendor sees both,
 * its own driving once. See docs/261028-fulfilment-vendors-and-connect.md,
 * "What people see in Connect".
 */
export default async function HomePage() {
  const access = await getConnectAccess();
  if (access.status === "signed-out") {
    return <Landing {...await landingData("public")} />;
  }
  if (access.status !== "ok") return <AccessScreen access={access} />;
  const member = memberOf(access);
  const now = new Date();
  const firstName =
    access.user.firstName ?? access.driver?.name.split(" ")[0] ?? null;
  const greeting = `${greetingAt(now)}${firstName ? `, ${firstName}` : ""}`;
  return member ? (
    <MemberHome member={member} greeting={greeting} now={now} />
  ) : (
    <DriverHome driver={access.driver!} greeting={greeting} now={now} />
  );
}

/** The band of a home: the greeting, and the counts beside it on a large screen. */
const BAND_GRID =
  "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-end lg:gap-10";

/** The job that matters now: one under way, else today's next, else the next one. */
function heroOf(jobs: DriverJobs): DriverTrip | null {
  const open = [...jobs.today, ...jobs.coming];
  return open.find((t) => tripStateOf(t).live) ?? open[0] ?? null;
}

async function DriverHome({
  driver,
  greeting,
  now,
}: {
  driver: NonNullable<LetIn["driver"]>;
  greeting: string;
  now: Date;
}) {
  const jobs = await listDriverJobs(driver);
  const hero = heroOf(jobs);
  const others = (trips: DriverTrip[]) =>
    trips.filter((t) => t.itemId !== hero?.itemId);
  const empty = hero === null && jobs.offers.length + jobs.done.length === 0;
  return (
    <Screen
      aside={
        <>
          {hero ? <NextJobCard trip={hero} now={now} /> : null}
          <WeekAhead trips={[...jobs.today, ...jobs.coming]} now={now} />
        </>
      }
      asideFirst={hero !== null}
      band={
        <div className={BAND_GRID}>
          <BandHeading eyebrow={longDayLabel(now)} title={greeting}>
            {driver.vendor.isOurs ? "Heavenly Travel" : driver.vendor.name} ·
            Driver
          </BandHeading>
          <BandStats
            items={[
              { label: "Offers", value: jobs.offers.length, alert: true },
              { label: "Today", value: jobs.today.length },
              { label: "Coming up", value: jobs.coming.length },
            ]}
          />
        </div>
      }
    >
      {jobs.offers.length > 0 ? (
        <section className="grid gap-3">
          <SectionTitle count={jobs.offers.length}>
            Waiting for your answer
          </SectionTitle>
          {jobs.offers.map((offer) => (
            <OfferCard key={offer.offerId} offer={offer} now={now} />
          ))}
        </section>
      ) : null}
      {empty ? (
        <EmptyState icon={CalendarCheckIcon} title="No jobs yet">
          A job Operation gives you shows here to accept. We tell you when one
          comes.
        </EmptyState>
      ) : null}
      <TripDays title="Today" trips={others(jobs.today)} now={now} />
      <TripDays title="Coming up" trips={others(jobs.coming)} now={now} />
      <DoneTrips trips={jobs.done} now={now} />
    </Screen>
  );
}

async function MemberHome({
  member,
  greeting,
  now,
}: {
  member: MemberAccess;
  greeting: string;
  now: Date;
}) {
  const driver = member.driver;
  const [offers, jobs, vehicles, drivers, ownJobs] = await Promise.all([
    listVendorOffers(member.vendor.id, member.user.id),
    listVendorJobs(member.vendor.id),
    listVehicles({ vendorId: member.vendor.id }),
    listDrivers({ vendorId: member.vendor.id }),
    driver ? listDriverJobs(driver) : null,
  ]);
  // Their own driving for this vendor is among its jobs already.
  const drivesHere = driver?.vendor.id === member.vendor.id;
  const hero = ownJobs ? heroOf(ownJobs) : null;
  const toFix = jobs.coming.filter(
    (t) => t.driver === null || !t.driverAccepted,
  ).length;
  const offerCount = offers.length + (ownJobs?.offers.length ?? 0);
  const ready =
    vehicles.some((v) => v.isActive) && drivers.some((d) => d.isActive);
  const quiet = offerCount + jobs.coming.length === 0;
  const nothing = quiet && jobs.done.length === 0;
  const setup = !ready || nothing;
  return (
    <Screen
      member={shellMember(member)}
      aside={
        <>
          {hero ? <NextJobCard trip={hero} now={now} /> : null}
          {setup ? (
            <GettingStarted
              vehicles={vehicles.filter((v) => v.isActive).length}
              drivers={drivers.filter((d) => d.isActive).length}
              driversSignedIn={drivers.filter((d) => d.userId).length}
              jobs={jobs.coming.length + jobs.done.length}
              owner={member.role === "owner"}
            />
          ) : null}
          <WeekAhead
            trips={[
              ...jobs.coming,
              ...(ownJobs && !drivesHere
                ? [...ownJobs.today, ...ownJobs.coming]
                : []),
            ]}
            now={now}
          />
        </>
      }
      asideFirst={hero !== null || setup}
      band={
        <div className={BAND_GRID}>
          <BandHeading eyebrow={greeting} title={member.vendor.name}>
            {longDayLabel(now)}
          </BandHeading>
          <BandStats
            items={[
              { label: "Offers", value: offerCount, alert: true },
              { label: "Coming up", value: jobs.coming.length },
              { label: "Need a driver", value: toFix, alert: true },
            ]}
          />
        </div>
      }
    >
      {offerCount > 0 ? (
        <section className="grid gap-3">
          <SectionTitle count={offerCount}>
            Waiting for your answer
          </SectionTitle>
          {offers.map((offer) => (
            <VendorOfferCard key={offer.offerId} offer={offer} now={now} />
          ))}
          {ownJobs?.offers.map((offer) => (
            <OfferCard key={offer.offerId} offer={offer} now={now} />
          ))}
        </section>
      ) : null}
      {ready && quiet ? (
        <EmptyState icon={InboxIcon} title="No offers right now">
          The jobs we offer you show here, with what we pay. Keep your vehicles
          and drivers in service to be offered more.
        </EmptyState>
      ) : null}
      <TripDays title="Coming up" trips={jobs.coming} now={now} />
      {ownJobs && !drivesHere ? (
        <TripDays
          title="Your own driving"
          trips={[...ownJobs.today, ...ownJobs.coming]}
          now={now}
        />
      ) : null}
      <DoneTrips trips={jobs.done} now={now} />
    </Screen>
  );
}
