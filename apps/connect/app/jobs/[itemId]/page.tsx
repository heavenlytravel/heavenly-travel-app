import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  CONTACT,
  CONTACT_VISIBLE_DAYS,
  formatLocalDate,
  formatLocalTime,
  waitingMinutes,
} from "@repo/db";
import { getDriverJob } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Card, CardTitle } from "@repo/console/Card";
import { AccessScreen } from "../../_components/AccessScreen";
import { ConnectShell } from "../../_components/ConnectShell";
import { actorOf, requireSignedIn } from "../../_lib/access";
import { TripTaps } from "./TripTaps";

/**
 * Route: /jobs/[itemId]. One of the driver's jobs: the trip, what the
 * customer needs from them once they accepted it, until a few days after
 * it, and the buttons to report the trip on the day. Opening the
 * customer's details is logged. See
 * docs/261028-fulfilment-vendors-and-connect.md, "On the day".
 */
export default async function JobPage({ params }: PageProps<"/jobs/[itemId]">) {
  const access = await requireSignedIn();
  if (access.status !== "ok") {
    return (
      <ConnectShell>
        <AccessScreen access={access} />
      </ConnectShell>
    );
  }
  if (!access.driver) notFound();
  const { itemId } = await params;
  const job = await getDriverJob(actorOf(access.user), access.driver, itemId);
  if (!job) notFound();
  const waited = waitingMinutes(job.events);
  const open =
    job.accepted && job.status !== "cancelled" && job.status !== "completed";

  return (
    <ConnectShell>
      <p className="text-sm">
        <Link
          href="/"
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All jobs
        </Link>
      </p>
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatLocalDate(job.startsAt)}, {formatLocalTime(job.startsAt)}
        </h1>
        <p className="text-slate-600">
          {job.reference}
          {job.position > 1 ? `, trip ${job.position}` : ""} · {job.className} ·{" "}
          {job.passengers} passengers
        </p>
        {job.status === "completed" ? (
          <span>
            <Badge tone="green">Done</Badge>
          </span>
        ) : job.status === "cancelled" ? (
          <span>
            <Badge tone="red">Cancelled</Badge>
          </span>
        ) : null}
      </div>

      <Card className="grid gap-3">
        <CardTitle>The customer</CardTitle>
        {job.customer ? (
          <dl className="grid gap-2 text-sm">
            <Row label="Name">{job.customer.name}</Row>
            <Row label="Phone">
              <a
                href={`tel:${job.customer.phone}`}
                className="font-medium underline underline-offset-4"
              >
                {job.customer.phone}
              </a>
            </Row>
            <Row label="Pick-up">{job.customer.pickup}</Row>
            {job.customer.dropoff ? (
              <Row label="Drop-off">{job.customer.dropoff}</Row>
            ) : (
              <Row label="Until">
                {job.endsAt ? formatLocalTime(job.endsAt) : "By the hour"}
              </Row>
            )}
            {job.customer.flightNumber ? (
              <Row label="Flight">{job.customer.flightNumber}</Row>
            ) : null}
            {job.customer.notes ? (
              <Row label="Notes">{job.customer.notes}</Row>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-slate-600">
            {job.accepted
              ? `The customer's details are hidden ${CONTACT_VISIBLE_DAYS} days after the trip. Call Operation on ${CONTACT.whatsappNumber} if you need them.`
              : "Accept the job to see the customer's name, phone and exact places."}
          </p>
        )}
      </Card>

      {job.accepted ? (
        <Card className="grid gap-4">
          <CardTitle>On the day</CardTitle>
          <TripTaps itemId={job.itemId} events={job.events} open={open} />
          {waited !== null ? (
            <p className="text-sm text-slate-600">
              You waited {waited} min for the passenger.
            </p>
          ) : null}
        </Card>
      ) : null}
    </ConnectShell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}
