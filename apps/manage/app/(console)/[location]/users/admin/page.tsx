import {
  ADMIN_TEAM_LABELS,
  adminTeamsOf,
  formatLocalDate,
  fullName,
  isMadeOrder,
  needsTeam,
  plural,
  searchTermOf,
  textOf,
  type MadeOrder,
} from "@repo/db";
import { getAccessPolicy, listAdmins } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { Notice } from "@repo/ui/notice";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed, TableSkeleton } from "@repo/console/Skeleton";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import { AddedTh } from "../../../../_components/AddedColumn";
import { SearchBox } from "../../../../_components/SearchBox";
import { requireAdmin } from "../../../../_lib/access";
import { SEARCH_PARAM, SORT_PARAM, adminsHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { AddStaffButton } from "./AddStaffButton";
import { AdminRowControls } from "./AdminRowControls";
import { TeamAccessCard } from "./TeamAccessCard";
import { WallSwitch } from "./WallSwitch";

/**
 * Route: /~/users/admin?q=…&sort=…. Admin: who has access to Manage,
 * their level and teams, each to edit or revoke, in the order they were
 * made admins or the newest first, the list narrowed by a search of
 * names and emails; "Add admin", which promotes an account or makes one;
 * the wall between the teams; and what each team can do, which SUPER may change.
 * Console-wide: under a slug it is not found. SUPER only.
 */
export default async function AdminPage({
  params,
  searchParams,
}: PageProps<"/[location]/users/admin">) {
  const admin = await requireAdmin("admins.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  const sort = textOf(query[SORT_PARAM]);
  const order = isMadeOrder(sort) ? sort : undefined;

  return (
    <>
      <PageHeader title="Admin" action={<AddStaffButton />} />
      <Streamed
        fallback={
          <div className="grid gap-5">
            <CardSkeleton rows={1} />
            <TableSkeleton columns={5} rows={6} />
            <TableSkeleton columns={7} rows={8} />
          </div>
        }
      >
        {() => staffList({ selfId: admin.id, q, order })}
      </Streamed>
    </>
  );
}

/** The wall between teams, then every member of staff, or those the search finds, then what each team can do. */
async function staffList({
  selfId,
  q,
  order,
}: {
  selfId: string;
  q?: string;
  /** None for the order they were made admins. */
  order?: MadeOrder;
}) {
  const [admins, found, { wallActive, overrides }] = await Promise.all([
    listAdmins(undefined, order),
    q ? listAdmins(q, order) : null,
    getAccessPolicy(),
  ]);
  // The warning counts every member, whatever the search shows.
  const withoutTeam = admins.filter(needsTeam).length;
  const shown = found ?? admins;

  return (
    <div className="grid gap-5">
      <Card>
        <CardTitle
          meta={
            <Badge dot tone={wallActive ? "green" : "neutral"}>
              {wallActive ? "On" : "Off"}
            </Badge>
          }
          action={<WallSwitch active={wallActive} />}
        >
          The wall between teams
        </CardTitle>
        <p className="text-sm text-body">
          {wallActive
            ? "Each admin reaches only the screens and actions of their teams."
            : "Every admin reaches every team screen and action."}{" "}
          Users stays with SUPER admins either way.
        </p>
        {withoutTeam > 0 ? (
          <Notice className="mt-4">
            {withoutTeam === 1
              ? "1 admin has no team."
              : `${withoutTeam} admins have no team.`}{" "}
            With the wall on they reach no team&apos;s screens: only Activity,
            of the locations&apos; status.
          </Notice>
        ) : null}
      </Card>
      <Card flush>
        <CardTitle
          inset
          meta={plural(shown.length, "person", "people")}
          action={
            <SearchBox
              href={adminsHref({ sort: order })}
              value={q ?? ""}
              label="Search admins"
              placeholder="Name or email"
            />
          }
        >
          Everyone with access
        </CardTitle>
        <Table bare>
          <THead>
            <Th>Name</Th>
            <Th>Level</Th>
            <Th>Teams</Th>
            <AddedTh
              sort={{
                order,
                fallback: "oldest",
                hrefOf: (next) => adminsHref({ q, sort: next }),
              }}
            >
              Since
            </AddedTh>
            <Th />
          </THead>
          <TBody>
            {shown.length === 0 ? (
              <EmptyRow colSpan={5}>No one matches “{q}”.</EmptyRow>
            ) : null}
            {shown.map((profile) => {
              const { user, level, createdAt } = profile;
              const isSelf = user.id === selfId;
              const teams = adminTeamsOf(profile.teams);
              return (
                <tr key={user.id}>
                  <Td className="min-w-56">
                    <TwoLines
                      top={
                        <>
                          {fullName(user) || "—"}
                          {isSelf ? (
                            <span className="ml-2 text-xs font-normal text-muted">
                              you
                            </span>
                          ) : null}
                        </>
                      }
                      bottom={user.email}
                    />
                  </Td>
                  <Td>
                    <Badge tone={level === "SUPER" ? "brand" : "neutral"}>
                      {level}
                    </Badge>
                  </Td>
                  <Td>
                    {needsTeam(profile) ? (
                      <Badge dot tone="amber">
                        No team
                      </Badge>
                    ) : teams.length === 0 ? (
                      <span className="text-muted">Everything</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {teams.map((team) => (
                          <Badge key={team} tone="navy">
                            {ADMIN_TEAM_LABELS[team]}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted tabular-nums">
                    {formatLocalDate(createdAt)}
                  </Td>
                  <Td>
                    {isSelf ? null : (
                      <AdminRowControls
                        userId={user.id}
                        email={user.email}
                        level={level}
                        teams={teams}
                      />
                    )}
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      </Card>
      {/* Keyed by the rules, so a save or a reset shows the boxes as stored. */}
      <TeamAccessCard
        key={JSON.stringify(overrides)}
        wallActive={wallActive}
        overrides={overrides}
      />
    </div>
  );
}
