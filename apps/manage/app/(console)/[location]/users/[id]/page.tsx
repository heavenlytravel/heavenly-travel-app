import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ADMIN_TEAM_LABELS,
  PASSWORD_MIN,
  adminTeamsOf,
  formatLocalDate,
  fullName,
  plural,
} from "@repo/db";
import { getUserDetails, listActivityForMany } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Card, CardTitle } from "@repo/console/Card";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { HistoryTimeline } from "../../../../_components/HistoryTimeline";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { adminsHref, bookingsHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { AdminAccess, ConnectAccess } from "../_components/Access";
import { PromoteButton } from "../admin/PromoteButton";
import { EmailForm, PasswordForm, ProfileForm } from "./UserForms";

/**
 * Route: /~/users/[id]. One account under All Users, in full control:
 * its profile (names and phone), the email it signs in with and a new
 * password, each its own form; where it has access, the website's
 * bookings, Admin and Connect, each opening where that access is kept;
 * and its history. Console-wide: under a slug it is not found. SUPER only
 * (`users.manage`).
 */
export default async function UserPage({
  params,
}: PageProps<"/[location]/users/[id]">) {
  await requireAdmin("users.manage");
  const [scope, { id }] = await Promise.all([scopeOf(params), params]);
  if (scope.slug !== null) notFound();
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<FormSkeleton sections={3} fields={3} />}
            side={<CardSkeleton rows={3} />}
          />
        </>
      }
    >
      {() => userScreen(id)}
    </Streamed>
  );
}

async function userScreen(id: string) {
  const [user, permissions] = await Promise.all([
    getUserDetails(id),
    getPermissions(),
  ]);
  if (!user) notFound();
  // Admin entries are logged against the account's user id too.
  const history = await listActivityForMany([
    { entityType: "user", entityId: id },
    { entityType: "admin", entityId: id },
  ]);
  const profile = user.adminProfile;
  const teams = profile ? adminTeamsOf(profile.teams) : [];
  const managesAdmins = permissions.includes("admins.manage");

  return (
    <>
      <PageHeader
        title={fullName(user) || user.email}
        meta={`${user.email} · joined ${formatLocalDate(user.createdAt)}`}
      />
      <DetailColumns
        main={
          <>
            <ProfileForm
              key={user.updatedAt.toISOString()}
              user={{
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
              }}
            />
            <EmailForm
              key={user.email}
              user={{ id: user.id, email: user.email }}
            />
            <PasswordForm user={{ id: user.id }} minLength={PASSWORD_MIN} />
          </>
        }
        side={
          <>
            <Card>
              <CardTitle>Access</CardTitle>
              <dl className="grid gap-4 text-sm">
                <div className="grid gap-1">
                  <dt className="font-medium text-ink">Website</dt>
                  <dd className="flex flex-wrap items-center gap-2 text-body">
                    {plural(user.bookingCount, "booking")}
                    {user.bookingCount > 0 &&
                    permissions.includes("bookings.view") ? (
                      <Link
                        href={bookingsHref(null, { q: user.email })}
                        className="font-medium text-brand underline-offset-4 hover:underline"
                      >
                        See bookings
                      </Link>
                    ) : null}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="font-medium text-ink">Admin</dt>
                  <dd className="grid justify-items-start gap-2 text-body">
                    <AdminAccess profile={profile} />
                    {profile && teams.length > 0 ? (
                      <span className="text-muted">
                        {teams
                          .map((team) => ADMIN_TEAM_LABELS[team])
                          .join(", ")}
                      </span>
                    ) : null}
                    {!managesAdmins ? null : profile ? (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={adminsHref(user.email)}>
                          Change on Admin
                        </Link>
                      </Button>
                    ) : (
                      <PromoteButton email={user.email} />
                    )}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="font-medium text-ink">Connect</dt>
                  <dd>
                    <ConnectAccess user={user} />
                  </dd>
                </div>
              </dl>
            </Card>
            <Card>
              <CardTitle>History</CardTitle>
              <HistoryTimeline
                entries={history}
                emptyMessage="Nothing recorded yet."
              />
            </Card>
          </>
        }
      />
    </>
  );
}
