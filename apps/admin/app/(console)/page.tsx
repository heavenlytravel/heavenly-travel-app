import Link from "next/link";
import {
  ADMIN_TEAM_LABELS,
  adminTeamsOf,
  type BookingStatus,
  type Permission,
} from "@repo/db";
import { dashboardCounts, type DashboardCounts } from "@repo/db/server";
import { PageHeader } from "../_components/PageHeader";
import { getPermissions, requireAdmin } from "../_lib/access";
import { bookingsHref } from "../_lib/routes";

type Card = {
  label: string;
  value: number;
  /** Narrows the bookings list to what the card counts, when a filter fits. */
  status?: BookingStatus;
};

type CardGroup = { team: string; cards: Card[] };

/**
 * The cards, grouped by the team whose work they count. Every admin sees
 * every group: each team gets a short view of the others' work. Sales and
 * Finance get groups when their features are built; no number is invented.
 */
function groupsOf(counts: DashboardCounts): CardGroup[] {
  return [
    {
      team: ADMIN_TEAM_LABELS.RESERVATION,
      cards: [
        {
          label: "Awaiting confirmation",
          value: counts.awaitingConfirmation,
          status: "received",
        },
        {
          label: "Confirmed, upcoming",
          value: counts.confirmedUpcoming,
          status: "confirmed",
        },
      ],
    },
    {
      team: ADMIN_TEAM_LABELS.OPERATION,
      cards: [
        { label: "Pick-ups today", value: counts.pickupsToday },
        { label: "Awaiting driver", value: counts.awaitingDriver },
        { label: "Active zones", value: counts.activeZones },
        { label: "Vehicle classes", value: counts.activeVehicleClasses },
      ],
    },
  ];
}

function whoAmI(admin: Awaited<ReturnType<typeof requireAdmin>>) {
  const { level, teams } = admin.adminProfile;
  const names = adminTeamsOf(teams).map((team) => ADMIN_TEAM_LABELS[team]);
  const role = names.length > 0 ? `${level}, ${names.join(" and ")}` : level;
  return `Signed in as ${admin.email}, ${role}.`;
}

/** Route: /. The same status cards for every admin, SUPER included. */
export default async function DashboardPage() {
  const admin = await requireAdmin("dashboard.view");
  const [counts, permissions] = await Promise.all([
    dashboardCounts(),
    getPermissions(),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" description={whoAmI(admin)} />

      {groupsOf(counts).map((group) => (
        <section key={group.team} className="mt-8">
          <h2 className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
            {group.team}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {group.cards.map((card) => (
              <StatCard
                key={card.label}
                card={card}
                permissions={permissions}
              />
            ))}
          </dl>
        </section>
      ))}

      <p className="mt-8 text-sm text-neutral-500">
        Sales and Finance cards arrive with their features. Nothing here is a
        placeholder.
      </p>
    </>
  );
}

/** One number. It links to the matching bookings list when the admin may open it. */
function StatCard({
  card,
  permissions,
}: {
  card: Card;
  permissions: readonly Permission[];
}) {
  const body = (
    <>
      <dt className="text-sm text-neutral-600">{card.label}</dt>
      <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {card.value}
      </dd>
    </>
  );
  const className = "block rounded-lg border border-neutral-200 bg-white p-5";
  return card.status && permissions.includes("bookings.view") ? (
    <Link
      href={bookingsHref(card.status)}
      className={`${className} transition-colors hover:border-neutral-300`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
