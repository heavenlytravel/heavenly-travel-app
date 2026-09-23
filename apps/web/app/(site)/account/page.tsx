import type { Metadata } from "next";
import Link from "next/link";
import { getAccess } from "@repo/db/server";
import { redirect } from "next/navigation";
import { PageTitle, Panel, Rows, primaryButton } from "../_components/Page";
import {
  ACCOUNT_BOOKINGS_PATH,
  ACCOUNT_PATH,
  signInHref,
} from "../../_lib/routes";

export const metadata: Metadata = {
  title: "Account | Heavenly Travel",
};

/** Route: /account. Who is signed in and where their bookings are. */
export default async function AccountPage() {
  const access = await getAccess("user");
  if (access.status === "signed-out") redirect(signInHref(ACCOUNT_PATH));

  const { user } = access;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <>
      <PageTitle eyebrow="Account" title="Your account." />
      <Panel className="max-w-[560px]">
        <Rows
          rows={[
            ["Name", name || "Not set"],
            ["Email", user.email],
            ["Phone", user.phone ?? "Not set"],
          ]}
        />
        <Link
          href={ACCOUNT_BOOKINGS_PATH}
          className={`${primaryButton} mt-6 w-full`}
        >
          My bookings
        </Link>
      </Panel>
    </>
  );
}
