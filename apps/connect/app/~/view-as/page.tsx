import type { Metadata } from "next";
import { mayViewAs } from "@repo/db";
import {
  getConnectAccess,
  getSession,
  listViewAsAccounts,
} from "@repo/db/server";
import { redirect } from "next/navigation";
import { Panel } from "../../_ui/parts";
import { BandHeading, Screen } from "../../_ui/Screen";
import { memberOf, shellMember } from "../../_lib/access";
import { CannotView, NOT_SUPER, ViewAsRules } from "./parts";
import { ViewAsList } from "./ViewAsList";

export const metadata: Metadata = { title: "View as | Connect" };

/**
 * Route: /~/view-as. For SUPER: everyone with a Connect account, by vendor,
 * to view Connect as, read only. View as in the places leads here; a SUPER
 * with no Connect account of their own lands here from Connect's home;
 * Switch and Exit in the view's banner lead here too. See docs/261112-connect-view-as.md.
 */
export default async function ViewAsPage() {
  const { user: me } = await getSession();
  if (!me) redirect("/sign-in");
  if (!mayViewAs(me)) return <CannotView text={NOT_SUPER} />;
  const [groups, access] = await Promise.all([
    listViewAsAccounts(),
    getConnectAccess(),
  ]);
  const viewing =
    access.status !== "signed-out" && access.viewAs ? access.user.id : null;
  // One's own account is never viewed.
  const others = groups
    .map((group) => ({
      ...group,
      people: group.people.filter((p) => p.userId !== me.id),
    }))
    .filter((group) => group.people.length > 0);

  return (
    <Screen
      member={
        access.status === "ok" ? shellMember(memberOf(access)) : undefined
      }
      band={
        <BandHeading eyebrow="Super admin" title="View as">
          See Connect as a vendor or a driver sees it.
        </BandHeading>
      }
    >
      <Panel className="connect-rise p-5">
        <ViewAsRules />
      </Panel>
      <ViewAsList groups={others} viewing={viewing} />
    </Screen>
  );
}
