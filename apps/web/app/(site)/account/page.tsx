import type { Metadata } from "next";
import Link from "next/link";
import { ADD_PASSWORD_PARAM, NEXT_PARAM } from "@repo/auth/account-paths";
import { AccountSettings } from "@repo/auth/AccountSettings";
import { safeRedirect } from "@repo/auth/redirect";
import { getAccess } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Rows } from "@repo/ui/rows";
import { redirect } from "next/navigation";
import { PageTitle, Panel } from "../_components/Page";
import {
  ACCOUNT_BOOKINGS_PATH,
  ACCOUNT_PATH,
  signInHref,
} from "../../_lib/routes";

export const metadata: Metadata = {
  title: "Account | Heavenly Travel",
};

/**
 * Route: /account. The customer's own account: their name, email,
 * password and devices (@repo/auth), then the phone we keep from their
 * last booking and the way to their bookings. After a sign-in by code to
 * an account without a password it opens on the offer of one
 * (`?add=password&next=…`).
 */
export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  const access = await getAccess("user");
  if (access.status === "signed-out") redirect(signInHref(ACCOUNT_PATH));
  const query = await searchParams;
  const next = query[NEXT_PARAM];

  return (
    <>
      <PageTitle eyebrow="Account" title="Your account." />
      <div className="grid max-w-[640px] gap-5">
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
        <Panel>
          <Rows
            rows={[
              ["Phone", access.user.phone ?? "Asked at your next booking"],
            ]}
          />
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href={ACCOUNT_BOOKINGS_PATH}>My bookings</Link>
          </Button>
        </Panel>
      </div>
    </>
  );
}
