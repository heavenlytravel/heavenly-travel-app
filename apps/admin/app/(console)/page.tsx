import Link from "next/link";
import { countBookings, listAdmins, listBookings } from "@repo/db/server";
import { BookingsTable } from "../_components/BookingsTable";
import { PageHeader, PreviewNotice } from "../_components/PageHeader";
import { requireAdmin } from "../_lib/access";
import { bookingsHref } from "../_lib/routes";
import { SAMPLE_LOCATIONS } from "./locations/sample-locations";

const RECENT = 5;

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const [admins, awaiting, recent] = await Promise.all([
    listAdmins(),
    countBookings({ status: "received" }),
    listBookings({}, RECENT),
  ]);

  const tiles = [
    { label: "Awaiting confirmation", value: String(awaiting) },
    {
      label: "Active locations",
      value: String(SAMPLE_LOCATIONS.filter((l) => l.isActive).length),
    },
    { label: "Drivers on duty", value: "8" },
    { label: "Admins", value: String(admins.length) },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${admin.email}, level ${admin.adminProfile.level}`}
      />
      <PreviewNotice>
        Locations and drivers show sample data. Bookings and admins are live.
      </PreviewNotice>

      <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border border-neutral-200 bg-white p-5"
          >
            <dt className="text-sm text-neutral-600">{tile.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight">
            Recent bookings
          </h2>
          <Link
            href={bookingsHref()}
            className="text-sm font-medium text-neutral-600 underline-offset-4 hover:underline"
          >
            All bookings
          </Link>
        </div>
        <div className="mt-4">
          <BookingsTable bookings={recent} emptyMessage="No bookings yet." />
        </div>
      </section>
    </>
  );
}
