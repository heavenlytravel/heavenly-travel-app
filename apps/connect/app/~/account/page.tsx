import type { Metadata } from "next";
import { ADD_PASSWORD_PARAM, NEXT_PARAM } from "@repo/auth/account-paths";
import { AccountSettings } from "@repo/auth/AccountSettings";
import { safeRedirect } from "@repo/auth/redirect";
import { memberOf, requireSignedIn, shellMember } from "../../_lib/access";
import { BandHeading, Screen } from "../../_ui/Screen";

export const metadata: Metadata = { title: "Your account | Connect" };

/**
 * Route: /account. The signed-in person's own account: their name, email,
 * password and devices (@repo/auth), opened from their picture. Anyone
 * signed in, let in or not, so someone waiting on a registration can
 * still add a password. After a sign-in by code to an account without a
 * password it opens on the offer of one (`?add=password&next=…`).
 */
export default async function AccountPage({
  searchParams,
}: PageProps<"/~/account">) {
  const access = await requireSignedIn();
  const member = access.status === "ok" ? memberOf(access) : null;
  const query = await searchParams;
  const next = query[NEXT_PARAM];

  return (
    <Screen
      member={shellMember(member)}
      nav={access.status === "ok"}
      back={{ href: "/~", label: "Back" }}
      band={<BandHeading title="Your account" />}
      width="narrow"
    >
      <AccountSettings
        offerPassword={
          query[ADD_PASSWORD_PARAM] === "password"
            ? {
                next: safeRedirect(
                  typeof next === "string" ? next : null,
                  "/",
                  "",
                ),
              }
            : undefined
        }
      />
    </Screen>
  );
}
