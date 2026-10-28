import { redirect } from "next/navigation";
import { VENDOR_ROLE_LABELS, isVendorRole } from "@repo/db";
import { listVendorMembers } from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { ConnectShell } from "../_components/ConnectShell";
import { requireMember, shellMember } from "../_lib/access";
import { AddStaffForm, RemoveStaffButton } from "./StaffControls";

/**
 * Route: /staff. The vendor's Connect accounts, for its owner: who sees
 * and answers its offers and keeps its fleet. The owner adds staff by
 * email and removes them; the owner stays. Drivers are not staff: they
 * see their own jobs, by the email on their driver row.
 */
export default async function StaffPage() {
  const member = await requireMember();
  if (member.role !== "owner") redirect("/");
  const members = await listVendorMembers(member.vendor.id);
  return (
    <ConnectShell member={shellMember(member)}>
      <PageHeader
        title="Staff"
        description="Who answers your offers and keeps your vehicles and drivers in Connect. Drivers do not need to be staff: they see their own jobs."
      />
      <Card className="grid gap-1" flush>
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-6 py-3"
            >
              <span className="grid">
                <span className="font-medium">{m.name || m.email}</span>
                <span className="text-sm text-slate-500">
                  {m.name ? `${m.email} · ` : ""}
                  {isVendorRole(m.role) ? VENDOR_ROLE_LABELS[m.role] : m.role}
                </span>
              </span>
              {m.role === "owner" ? null : (
                <RemoveStaffButton memberId={m.id} email={m.email} />
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="grid gap-3">
        <CardTitle>Add staff</CardTitle>
        <AddStaffForm />
      </Card>
    </ConnectShell>
  );
}
