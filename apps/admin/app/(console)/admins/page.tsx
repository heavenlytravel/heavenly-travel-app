import { ADMIN_TEAM_LABELS, adminTeamsOf, fullName, needsTeam } from "@repo/db";
import { isWallActive, listAdmins } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { PageHeader } from "../../_components/PageHeader";
import { requireAdmin } from "../../_lib/access";
import { AdminRowControls } from "./AdminRowControls";
import { PromoteForm } from "./PromoteForm";
import { WallSwitch } from "./WallSwitch";

/** Route: /admins. Who is staff, their level and teams, and the wall. SUPER only. */
export default async function AdminsPage() {
  const admin = await requireAdmin("admins.manage");
  const [admins, wallActive] = await Promise.all([
    listAdmins(),
    isWallActive(),
  ]);
  const withoutTeam = admins.filter(needsTeam).length;

  return (
    <>
      <PageHeader
        title="Admins"
        description="Staff access is invite-only. A SUPER admin promotes an existing customer account and sets its teams."
      />

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
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
            With the wall on they reach only the Dashboard.
          </p>
        ) : null}
      </section>

      <PromoteForm />

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Teams</th>
              <th className="px-4 py-3 font-medium">Since</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {admins.map((profile) => {
              const { user, level, createdAt } = profile;
              const isSelf = user.id === admin.id;
              const name = fullName(user);
              const teams = adminTeamsOf(profile.teams);
              return (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">
                    {name || "—"}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-neutral-500">
                        you
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={level === "SUPER" ? "blue" : "neutral"}>
                      {level}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-neutral-600 tabular-nums">
                    {createdAt.toLocaleDateString("en-MY", {
                      dateStyle: "medium",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? null : (
                      <AdminRowControls
                        userId={user.id}
                        email={user.email}
                        level={level}
                        teams={teams}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
