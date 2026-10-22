import {
  ADMIN_TEAM_LABELS,
  adminTeamsOf,
  fullName,
  needsTeam,
  searchTermOf,
} from "@repo/db";
import { isWallActive, listAdmins } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { PageHeader } from "../../_components/PageHeader";
import { Card, CardTitle } from "../../_components/Card";
import {
  CardSkeleton,
  Streamed,
  TableSkeleton,
} from "../../_components/Skeleton";
import { SearchBox } from "../../_components/SearchBox";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../../_components/Table";
import { requireAdmin } from "../../_lib/access";
import { ADMINS_PATH, SEARCH_PARAM } from "../../_lib/routes";
import { AdminRowControls } from "./AdminRowControls";
import { PromoteForm } from "./PromoteForm";
import { WallSwitch } from "./WallSwitch";

/**
 * Route: /admins?q=…. Who is staff, their level and teams, and the wall;
 * the list narrowed by a search of names and emails. SUPER only.
 */
export default async function AdminsPage({
  searchParams,
}: PageProps<"/admins">) {
  const admin = await requireAdmin("admins.manage");
  const q = searchTermOf((await searchParams)[SEARCH_PARAM]) ?? undefined;

  return (
    <>
      <PageHeader
        title="Admins"
        description="Staff access is invite-only. A SUPER admin promotes an existing customer account and sets its teams."
      />

      <Streamed
        fallback={
          <>
            <div className="mt-6">
              <CardSkeleton rows={1} />
            </div>
            <div className="mt-6">
              <CardSkeleton rows={1} />
            </div>
            <div className="mt-6">
              <TableSkeleton columns={6} rows={5} />
            </div>
          </>
        }
      >
        {() => adminsList({ selfId: admin.id, q })}
      </Streamed>
    </>
  );
}

/** The wall, the promote form and every admin, or those the search finds, with their level and teams. */
async function adminsList({ selfId, q }: { selfId: string; q?: string }) {
  const [admins, found, wallActive] = await Promise.all([
    listAdmins(),
    q ? listAdmins(q) : null,
    isWallActive(),
  ]);
  // The warning counts every admin, whatever the search shows.
  const withoutTeam = admins.filter(needsTeam).length;
  const shown = found ?? admins;

  return (
    <>
      <Card className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              The wall
              <Badge tone={wallActive ? "green" : "neutral"}>
                {wallActive ? "On" : "Off"}
              </Badge>
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {wallActive
                ? "Each admin reaches only the screens and actions of their teams."
                : "Every admin reaches every team screen and action."}{" "}
              This page stays with SUPER admins either way.
            </p>
          </div>
          <WallSwitch active={wallActive} />
        </div>
        {withoutTeam > 0 ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {withoutTeam === 1
              ? "1 admin has no team."
              : `${withoutTeam} admins have no team.`}{" "}
            With the wall on they reach only the home and the locations'
            overviews.
          </p>
        ) : null}
      </Card>

      <PromoteForm />

      <Card flush className="mt-6">
        <CardTitle
          inset
          action={
            <SearchBox
              href={ADMINS_PATH}
              value={q ?? ""}
              label="Search admins"
              placeholder="Name or email"
            />
          }
        >
          Every admin
        </CardTitle>
        <Table bare>
          <THead>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Level</Th>
            <Th>Teams</Th>
            <Th>Since</Th>
            <Th />
          </THead>
          <TBody>
            {shown.length === 0 ? (
              <EmptyRow colSpan={6}>No admin matches “{q}”.</EmptyRow>
            ) : null}
            {shown.map((profile) => {
              const { user, level, createdAt } = profile;
              const isSelf = user.id === selfId;
              const name = fullName(user);
              const teams = adminTeamsOf(profile.teams);
              return (
                <tr key={user.id}>
                  <Td className="font-medium">
                    {name || "—"}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-neutral-500">
                        you
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-neutral-600">{user.email}</Td>
                  <Td>
                    <Badge tone={level === "SUPER" ? "blue" : "neutral"}>
                      {level}
                    </Badge>
                  </Td>
                  <Td>
                    {needsTeam(profile) ? (
                      <Badge tone="amber">No team</Badge>
                    ) : teams.length === 0 ? (
                      <span className="text-neutral-500">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {teams.map((team) => (
                          <Badge key={team}>{ADMIN_TEAM_LABELS[team]}</Badge>
                        ))}
                      </span>
                    )}
                  </Td>
                  <Td className="text-neutral-600 tabular-nums">
                    {createdAt.toLocaleDateString("en-MY", {
                      dateStyle: "medium",
                    })}
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
    </>
  );
}
