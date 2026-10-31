import Link from "next/link";
import { VENDOR_ROLE_LABELS, isVendorRole } from "@repo/db";
import type { ListedUser } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { vendorHref } from "../../../../_lib/routes";

/** An account's admin level, or a dash for none: All Users' Admin column and a user's page. */
export function AdminAccess({
  profile,
}: {
  profile: ListedUser["adminProfile"];
}) {
  if (!profile) return <span className="text-muted">—</span>;
  return (
    <Badge tone={profile.level === "SUPER" ? "brand" : "neutral"}>
      {profile.level}
    </Badge>
  );
}

/**
 * Where an account is in Connect: each vendor it works for, as owner or
 * staff, and the vendor it drives for, each opening the vendor. A dash
 * for none.
 */
export function ConnectAccess({
  user,
}: {
  user: Pick<ListedUser, "vendorMembers" | "driver">;
}) {
  const rows = [
    ...user.vendorMembers.map((member) => ({
      key: `member:${member.vendor.id}`,
      role: isVendorRole(member.role)
        ? VENDOR_ROLE_LABELS[member.role]
        : member.role,
      vendor: member.vendor,
    })),
    ...(user.driver
      ? [
          {
            key: `driver:${user.driver.id}`,
            role: "Driver",
            vendor: user.driver.vendor,
          },
        ]
      : []),
  ];
  if (rows.length === 0) return <span className="text-muted">—</span>;
  return (
    <span className="grid gap-1">
      {rows.map((row) => (
        <span key={row.key} className="flex flex-wrap items-center gap-1.5">
          <Badge tone="green">{row.role}</Badge>
          <Link
            href={vendorHref(null, row.vendor.id)}
            className="text-sm text-body underline-offset-4 hover:underline"
          >
            {row.vendor.name}
          </Link>
        </span>
      ))}
    </span>
  );
}
