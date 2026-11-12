import type { Metadata } from "next";
import {
  fullName,
  isVendorRole,
  mayViewAs,
  VENDOR_ROLE_LABELS,
  VIEW_AS_PATH,
} from "@repo/db";
import { getSession, getViewAsCandidate } from "@repo/db/server";
import { Eye } from "lucide-react";
import { redirect } from "next/navigation";
import { Panel } from "../../../_ui/parts";
import { BandHeading, Screen } from "../../../_ui/Screen";
import { SubmitButton } from "../../../_ui/SubmitButton";
import { startViewAsAction } from "../actions";
import { CannotView, NOT_SUPER, ViewAsRules } from "../parts";

export const metadata: Metadata = { title: "View as | Connect" };

/**
 * Route: /~/view-as/[userId], opened from a driver's "View in Connect" in
 * the console. Names whose Connect a SUPER is about to view, what it is
 * for them, and Start. Anyone else, or an account that cannot be viewed,
 * is told why. See docs/261112-connect-view-as.md.
 */
export default async function ViewAsOnePage({
  params,
}: PageProps<"/~/view-as/[userId]">) {
  const { user: me } = await getSession();
  if (!me) redirect("/sign-in");
  if (!mayViewAs(me)) return <CannotView text={NOT_SUPER} />;
  const { userId } = await params;
  const target = await getViewAsCandidate(me, userId);
  if (!target) {
    return (
      <CannotView text="This account can't be viewed: it was deleted, or it is your own." />
    );
  }
  const roles = [
    ...target.vendorMembers.map(
      (m) =>
        `${isVendorRole(m.role) ? VENDOR_ROLE_LABELS[m.role] : m.role} of ${m.vendor.name}`,
    ),
    ...(target.driver ? [`Driver for ${target.driver.vendor.name}`] : []),
  ];

  return (
    <Screen
      nav={false}
      width="narrow"
      back={{ href: VIEW_AS_PATH, label: "Everyone" }}
      band={
        <BandHeading eyebrow="View as" title={fullName(target) || target.email}>
          {target.email}
        </BandHeading>
      }
    >
      <Panel className="connect-rise grid gap-5 p-6">
        <span className="grid size-14 place-items-center rounded-card bg-warning-soft text-warning">
          <Eye aria-hidden className="size-7" />
        </span>
        <p className="text-base text-pretty text-body">
          {roles.length > 0
            ? `${roles.join(". ")}.`
            : "Not on Connect yet: you will see the screen they see."}
        </p>
        <ViewAsRules />
        <form action={startViewAsAction.bind(null, target.id)}>
          <SubmitButton size="lg" className="w-full">
            Start viewing
          </SubmitButton>
        </form>
      </Panel>
    </Screen>
  );
}
