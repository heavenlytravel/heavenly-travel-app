import { listAdmins } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { PageHeader, PreviewNotice } from "../_components/PageHeader";
import { requireAdmin } from "../_lib/access";
import { SAMPLE_LOCATIONS } from "./locations/sample-locations";

// Sample figures until bookings exist in the database.
const SAMPLE_BOOKINGS = [
  {
    ref: "HT-1042",
    customer: "Nurul Aina",
    route: "KLIA → Kuala Lumpur",
    service: "Car with driver",
    status: "Confirmed",
  },
  {
    ref: "HT-1041",
    customer: "Daniel Lim",
    route: "Langkawi Airport → Pantai Cenang",
    service: "Car with driver",
    status: "Pending",
  },
  {
    ref: "HT-1040",
    customer: "SMK Seri Bintang",
    route: "Kuala Lumpur → Pulau Pinang",
    service: "Coach charter",
    status: "Confirmed",
  },
  {
    ref: "HT-1039",
    customer: "Farah Izzati",
    route: "Pulau Pinang → KLIA",
    service: "Car with driver",
    status: "Completed",
  },
] as const;

const STATUS_TONE = {
  Confirmed: "green",
  Pending: "amber",
  Completed: "neutral",
} as const;

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const admins = await listAdmins();

  const tiles = [
    { label: "Bookings today", value: "12" },
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
        Bookings, locations and drivers show sample data. Only the admin count
        is live.
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
        <h2 className="text-base font-semibold tracking-tight">
          Recent bookings
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {SAMPLE_BOOKINGS.map((booking) => (
                <tr key={booking.ref}>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {booking.ref}
                  </td>
                  <td className="px-4 py-3">{booking.customer}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {booking.route}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {booking.service}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[booking.status]}>
                      {booking.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
