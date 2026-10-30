import {
  ADMIN_TEAM_LABELS,
  adminTeamsOf,
  formatLocalDate,
  fullName,
  needsTeam,
  plural,
  searchTermOf,
} from "@repo/db";
import { isWallActive, listAdmins } from "@repo/db/server";
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
import { SearchBox } from "../../../_components/SearchBox";
import { requireAdmin } from "../../../_lib/access";
import { SEARCH_PARAM, staffHref } from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import { AdminRowControls } from "./AdminRowControls";
import { PromoteButton } from "./PromoteButton";
import { TeamAccessCard } from "./TeamAccessCard";
import { WallSwitch } from "./WallSwitch";

/**
 * Route: /~/team?q=…. The staff: who has access, their level and teams,
 * each to edit or revoke, the list narrowed by a search of names and
 * emails; "Promote to staff" for an account that exists; the wall between
 * the teams; and what each team can do, read from the rules.
 * Console-wide: under a slug it is not found. SUPER only.
 */
export default async function StaffPage({
  params,
  searchParams,
}: PageProps<"/[location]/team">) {
  const admin = await requireAdmin("admins.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const q = searchTermOf((await searchParams)[SEARCH_PARAM]) ?? undefined;

  return (
    <>
      <PageHeader title="Staff" action={<PromoteButton />} />
      <Streamed
        fallback={
          <div className="grid gap-5">
            <CardSkeleton rows={1} />
            <TableSkeleton columns={5} rows={6} />
            <TableSkeleton columns={7} rows={8} />
          </div>
        }
      >
        {() => staffList({ selfId: admin.id, q })}
      </Streamed>
    </>
  );
}

/** The wall between teams, then every member of staff, or those the search finds, then what each team can do. */
async function staffList({ selfId, q }: { selfId: string; q?: string }) {
  const [admins, found, wallActive] = await Promise.all([
    listAdmins(),
    q ? listAdmins(q) : null,
    isWallActive(),
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
          Staff stays with SUPER admins either way.
        </p>
        {withoutTeam > 0 ? (
          <Notice className="mt-4">
            {withoutTeam === 1
              ? "1 admin has no team."
              : `${withoutTeam} admins have no team.`}{" "}
            With the wall on they reach only the dashboard and the
            locations&apos; overviews.
          </Notice>
        ) : null}
      </Card>
      <Card flush>
        <CardTitle
          inset
          meta={plural(shown.length, "person", "people")}
          action={
            <SearchBox
              href={staffHref()}
              value={q ?? ""}
              label="Search staff"
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
            <Th>Since</Th>
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
      <TeamAccessCard wallActive={wallActive} />
    </div>
  );
}
