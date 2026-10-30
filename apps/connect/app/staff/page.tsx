import { redirect } from "next/navigation";
import { VENDOR_ROLE_LABELS, isVendorRole } from "@repo/db";
import { listVendorMembers } from "@repo/db/server";
import { Crown } from "lucide-react";
import { requireMember, shellMember } from "../_lib/access";
import { Avatar, Panel } from "../_ui/parts";
import { BandHeading, Screen } from "../_ui/Screen";
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
    <Screen
      member={shellMember(member)}
      aside={
        <Panel className="grid gap-4 p-5">
          <h2 className="text-lg font-bold tracking-title text-ink">
            Add someone
          </h2>
          <AddStaffForm />
        </Panel>
      }
      band={
        <BandHeading eyebrow={member.vendor.name} title="Team">
          Who answers your offers and keeps your fleet. Drivers need not be
          here: they see their own jobs.
        </BandHeading>
      }
    >
      <Panel className="connect-rise overflow-hidden">
        <ul className="divide-y divide-hairline">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 px-4 py-4 sm:px-5"
            >
              <Avatar name={m.name || m.email} />
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate font-semibold text-ink">
                  {m.name || m.email}
                </span>
                <span className="flex items-center gap-1.5 truncate text-sm text-muted">
                  {m.role === "owner" ? (
                    <Crown aria-hidden className="size-3.5 text-warning" />
                  ) : null}
                  {isVendorRole(m.role) ? VENDOR_ROLE_LABELS[m.role] : m.role}
                  {m.name ? ` · ${m.email}` : ""}
                </span>
              </span>
              {m.role === "owner" ? null : (
                <RemoveStaffButton memberId={m.id} email={m.email} />
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </Screen>
  );
}
