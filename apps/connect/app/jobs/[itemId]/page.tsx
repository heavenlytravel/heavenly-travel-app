import { notFound } from "next/navigation";
import {
  CONTACT,
  CONTACT_VISIBLE_DAYS,
  nextTripStep,
  waitingMinutes,
  whatsappHref,
} from "@repo/db";
import { getDriverJob, getVendorJob, type JobStop } from "@repo/db/server";
import {
  Hourglass,
  Lock,
  MessageCircle,
  NotebookText,
  Phone,
  Plane,
  Users,
} from "lucide-react";
import { AccessScreen } from "../../_components/AccessScreen";
import {
  actorOf,
  memberOf,
  requireSignedIn,
  shellMember,
} from "../../_lib/access";
import { googleMapsHref, wazeHref } from "../../_lib/navigate";
import { tripStateOf } from "../../_lib/trip-state";
import { dayLabel } from "../../_lib/when";
import { buttonClass } from "../../_ui/button";
import {
  Avatar,
  BigTime,
  Fact,
  Panel,
  Pill,
  Plate,
  RouteLine,
  type Stop,
} from "../../_ui/parts";
import { Screen } from "../../_ui/Screen";
import { TripTimeline } from "../../_ui/TripTimeline";
import { areaStops } from "../../_ui/Trips";
import { TripTaps } from "./TripTaps";

/**
 * Route: /jobs/[itemId]. One of the driver's jobs, or of their vendor's
 * for its owner and staff, who see its reports but do not make them: the
 * time large on the band, the customer with a call, a WhatsApp and the
 * way to each stop in Waze or Google Maps once accepted, until a few days
 * after it, and the trip's steps to report on the day. Opening the
 * customer's details is logged. See
 * docs/261028-fulfilment-vendors-and-connect.md, "On the day".
 */
export default async function JobPage({ params }: PageProps<"/jobs/[itemId]">) {
  const access = await requireSignedIn();
  if (access.status !== "ok") return <AccessScreen access={access} />;
  const { itemId } = await params;
  const member = memberOf(access);
  // Their own driving first; else their vendor's job, without the reports.
  const driverJob = access.driver
    ? await getDriverJob(actorOf(access.user), access.driver, itemId)
    : null;
  const vendorJob =
    !driverJob && member
      ? await getVendorJob(actorOf(access.user), member.vendor, itemId)
      : null;
  const job = driverJob ?? vendorJob;
  if (!job) notFound();
  const now = new Date();
  const state = tripStateOf(job);
  const waited = waitingMinutes(job.events);
  const open =
    driverJob !== null &&
    job.accepted &&
    job.status !== "cancelled" &&
    job.status !== "completed";

  const onTheDay = job.accepted ? (
    <Panel className="grid gap-5 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">On the day</h2>
        {waited !== null ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <Hourglass aria-hidden className="size-4" />
            Waited {waited} min
          </span>
        ) : null}
      </div>
      {driverJob ? (
        <TripTaps itemId={job.itemId} events={job.events} open={open} />
      ) : (
        <TripTimeline
          events={job.events.map((e) => ({
            key: e.id,
            kind: e.kind,
            at: e.at,
            note: e.note,
            sent: true,
          }))}
          next={job.status === "cancelled" ? null : nextTripStep(job.events)}
        />
      )}
    </Panel>
  ) : null;

  return (
    <Screen
      member={shellMember(member)}
      aside={onTheDay}
      back={{ href: "/", label: "Jobs" }}
      band={
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-azure-light">
              {dayLabel(job.startsAt, now)}
              {job.position > 1 ? ` · trip ${job.position}` : ""}
            </span>
            <Pill tone={state.tone} live={state.live}>
              {state.label}
            </Pill>
          </div>
          <div className="flex items-end gap-3">
            <BigTime
              at={job.startsAt}
              className="text-6xl text-white"
              periodClassName="text-azure-light"
            />
            {job.endsAt ? (
              <span className="pb-1.5 text-sm text-white/60">
                until{" "}
                <BigTime at={job.endsAt} className="text-base text-white" />
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold ring-1 ring-white/10">
              {job.className}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold ring-1 ring-white/10">
              <Users aria-hidden className="size-3.5" />
              {job.passengers}
            </span>
            <span className="ml-auto font-semibold text-white/50 tabular-nums">
              {job.reference}
            </span>
          </div>
        </div>
      }
    >
      {job.customer ? (
        <Panel className="connect-rise grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-x-8 lg:p-6">
          <div className="grid content-start gap-5">
            <div className="flex items-center gap-3">
              <Avatar name={job.customer.name} size="lg" />
              <div className="grid min-w-0 gap-0.5">
                <span className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">
                  Passenger
                </span>
                <span className="truncate text-xl font-bold text-ink">
                  {job.customer.name}
                </span>
                <span className="text-sm text-slate-500 tabular-nums">
                  {job.customer.phone}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${job.customer.phone}`}
                className={buttonClass({ variant: "soft", size: "lg" })}
              >
                <Phone aria-hidden className="size-5" />
                Call
              </a>
              <a
                href={whatsappHref(job.customer.phone)}
                target="_blank"
                rel="noreferrer"
                className={buttonClass({
                  variant: "soft",
                  size: "lg",
                  className:
                    "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:bg-emerald-100",
                })}
              >
                <MessageCircle aria-hidden className="size-5" />
                WhatsApp
              </a>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <RouteLine
              stops={[
                stopRow(job.customer.pickup, "Pick-up", job.pickupArea),
                ...(job.customer.dropoff
                  ? [
                      stopRow(
                        job.customer.dropoff,
                        "Drop-off",
                        job.dropoffArea ?? "",
                      ),
                    ]
                  : []),
              ]}
            />
          </div>
          {job.customer.flightNumber || job.customer.notes ? (
            <div className="grid gap-3 border-t border-slate-100 pt-5 lg:col-span-2">
              {job.customer.flightNumber ? (
                <Fact icon={Plane} label="Flight">
                  {job.customer.flightNumber}
                </Fact>
              ) : null}
              {job.customer.notes ? (
                <Fact icon={NotebookText} label="Notes from the customer">
                  {job.customer.notes}
                </Fact>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : (
        <Panel className="connect-rise grid gap-5 p-5">
          <RouteLine stops={areaStops(job)} />
          <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <Lock
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-slate-400"
            />
            <p>
              {job.accepted
                ? `The customer's details are hidden ${CONTACT_VISIBLE_DAYS} days after the trip. Call Operation on ${CONTACT.whatsappNumber} if you need them.`
                : "Accept the job to see the customer's name, phone and exact places."}
            </p>
          </div>
        </Panel>
      )}

      {vendorJob ? (
        <Panel className="grid gap-4 p-5">
          <h2 className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">
            Who does it
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {vendorJob.vehicle ? (
              <Plate>{vendorJob.vehicle}</Plate>
            ) : (
              <span className="text-sm text-slate-500">Vehicle not yours</span>
            )}
            {vendorJob.driver ? (
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Avatar name={vendorJob.driver} size="sm" />
                {vendorJob.driver}
              </span>
            ) : (
              <span className="text-sm text-slate-500">Driver not yours</span>
            )}
          </div>
        </Panel>
      ) : null}
    </Screen>
  );
}

/** An exact stop on the route, with the ways to drive there. */
function stopRow(stop: JobStop | null, what: string, area: string): Stop {
  if (!stop) return { title: area, detail: what };
  return {
    title: stop.label,
    detail: stop.address,
    action: (
      <span className="flex gap-1.5">
        <a
          href={wazeHref(stop)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${what} in Waze`}
          className={buttonClass({ variant: "soft", size: "sm" })}
        >
          Waze
        </a>
        <a
          href={googleMapsHref(stop)}
          target="_blank"
          rel="noreferrer"
          aria-label={`${what} in Google Maps`}
          className={buttonClass({ variant: "soft", size: "sm" })}
        >
          Maps
        </a>
      </span>
    ),
  };
}
