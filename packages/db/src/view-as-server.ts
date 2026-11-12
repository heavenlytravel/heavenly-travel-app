import "server-only";
import type { AdminActor } from "./activity-actions";
import { logActivity } from "./activity";
import { db } from "./client";
import { fullName } from "./names";
import { isVendorRole, VENDOR_ROLE_LABELS } from "./vendor-input";

/**
 * Connect's view-as, for SUPER: the accounts that may be viewed, and the
 * log of a view's start and end. See docs/261112-connect-view-as.md.
 */

/** One account under its vendor on the View as list. */
export type ViewAsPerson = {
  userId: string;
  name: string;
  email: string;
  /** "Owner", "Staff" or "Driver"; both when one drives for their own vendor. */
  roles: string[];
};

/** A vendor and the accounts that sign in to Connect for it. */
export type ViewAsGroup = {
  vendor: { id: string; name: string; status: string; isOurs: boolean };
  people: ViewAsPerson[];
};

const account = {
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
  },
} as const;

/**
 * Everyone with a Connect account, by vendor: its owner and staff, and its
 * drivers who have an account. Vendors by name, the owner first, then by name.
 */
export async function listViewAsAccounts(): Promise<ViewAsGroup[]> {
  const vendors = await db.vendor.findMany({
    where: {
      OR: [
        { members: { some: {} } },
        { drivers: { some: { userId: { not: null } } } },
      ],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      isOurs: true,
      members: { select: { role: true, user: account } },
      drivers: {
        where: { userId: { not: null } },
        select: { user: account },
      },
    },
  });
  return vendors
    .map(({ members, drivers, ...vendor }) => {
      const people = new Map<string, ViewAsPerson>();
      const add = (
        user: (typeof members)[number]["user"] | null,
        role: string,
      ) => {
        if (!user) return;
        const person = people.get(user.id) ?? {
          userId: user.id,
          name: fullName(user) || user.email,
          email: user.email,
          roles: [],
        };
        person.roles.push(role);
        people.set(user.id, person);
      };
      for (const member of members) {
        add(
          member.user,
          isVendorRole(member.role)
            ? VENDOR_ROLE_LABELS[member.role]
            : member.role,
        );
      }
      for (const driver of drivers) add(driver.user, "Driver");
      const owns = (p: ViewAsPerson) =>
        Number(p.roles.includes(VENDOR_ROLE_LABELS.owner));
      return {
        vendor,
        people: [...people.values()].sort(
          (a, b) => owns(b) - owns(a) || a.name.localeCompare(b.name),
        ),
      };
    })
    .filter((group) => group.people.length > 0);
}

/**
 * Logs a SUPER starting or ending a view of Connect as an account, on that
 * account's history, in the Team area.
 */
export async function logViewAs(
  actor: AdminActor,
  userId: string,
  view: "started" | "ended",
) {
  await db.$transaction((tx) =>
    logActivity(tx, actor, {
      action:
        view === "started"
          ? "connect.view-as.started"
          : "connect.view-as.ended",
      entityId: userId,
    }),
  );
}
