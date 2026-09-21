import { listAdmins } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { PageHeader } from "../../_components/PageHeader";
import { isSuper, requireAdmin } from "../../_lib/access";
import { AdminRowControls } from "./AdminRowControls";
import { PromoteForm } from "./PromoteForm";

export default async function AdminsPage() {
  const admin = await requireAdmin();
  const canManage = isSuper(admin);
  const admins = await listAdmins();

  return (
    <>
      <PageHeader
        title="Admins"
        description="Staff access is invite-only. A SUPER admin promotes an existing customer account."
      />

      {canManage ? <PromoteForm /> : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Since</th>
              {canManage ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {admins.map(({ user, level, createdAt }) => {
              const isSelf = user.id === admin.id;
              const name = [user.firstName, user.lastName]
                .filter(Boolean)
                .join(" ");
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
                  <td className="px-4 py-3 text-neutral-600 tabular-nums">
                    {createdAt.toLocaleDateString("en-MY", {
                      dateStyle: "medium",
                    })}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      {isSelf ? null : (
                        <AdminRowControls
                          userId={user.id}
                          email={user.email}
                          level={level}
                        />
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
