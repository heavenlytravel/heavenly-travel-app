import { ADD_PASSWORD_PARAM, NEXT_PARAM } from "@repo/auth/account-paths";
import { AccountSettings } from "@repo/auth/AccountSettings";
import { safeRedirect } from "@repo/auth/redirect";
import { PageHeader } from "@repo/console/PageHeader";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../_lib/access";
import { scopeOf } from "../../../_lib/scope";

/**
 * Route: /~/account. The admin's own account: their name, email, password
 * and devices (@repo/auth), opened from their picture in the top bar.
 * After a sign-in by code to an account without a password it opens on
 * the offer of one (`?add=password&next=…`). Console-wide: under a slug it
 * is not found. Every admin.
 */
export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[location]/account">) {
  await requireAdmin("locations.view");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  const next = query[NEXT_PARAM];

  return (
    <>
      <PageHeader title="Your Account" />
      <div className="max-w-2xl">
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
      </div>
    </>
  );
}
