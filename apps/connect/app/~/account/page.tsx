import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CarFront, ChevronRight, Languages } from "lucide-react";
import { getGuideByEmail } from "@repo/db/server";
import { ADD_PASSWORD_PARAM, NEXT_PARAM } from "@repo/auth/account-paths";
import { AccountSettings } from "@repo/auth/AccountSettings";
import { safeRedirect } from "@repo/auth/redirect";
import { memberOf, requireSignedIn, shellMember } from "../../_lib/access";
import { Panel } from "../../_ui/parts";
import { BandHeading, Screen } from "../../_ui/Screen";

export const metadata: Metadata = { title: "Your account | Connect" };

/**
 * Route: /account. The signed-in person's own account, opened from their
 * picture: first the profiles that are theirs, once let in (the business
 * they are a member of, their driver record, the guide record with their
 * email), each a page of its own; then their name, email, password and
 * devices (@repo/auth). Anyone
 * signed in, let in or not, so someone waiting on a registration can
 * still add a password. After a sign-in by code to an account without a
 * password it opens on the offer of one (`?add=password&next=…`).
 */
export default async function AccountPage({
  searchParams,
}: PageProps<"/~/account">) {
  const access = await requireSignedIn();
  const member = access.status === "ok" ? memberOf(access) : null;
  const guide =
    access.status === "ok" ? await getGuideByEmail(access.user.email) : null;
  const profiles = [
    ...(member
      ? [
          {
            href: "/~/account/business",
            icon: Building2,
            title: member.vendor.name,
            line:
              member.role === "owner"
                ? "Your business's details and bank. You keep them up to date."
                : "Your business's details, as its owner keeps them.",
          },
        ]
      : []),
    ...(access.status === "ok" && access.driver
      ? [
          {
            href: "/~/account/driver",
            icon: CarFront,
            title: "Your driver profile",
            line: "Your classes, licences and where we pay you.",
          },
        ]
      : []),
    ...(guide
      ? [
          {
            href: "/~/account/guide",
            icon: Languages,
            title: "Your guide profile",
            line: "Your languages, licence and where we pay you.",
          },
        ]
      : []),
  ];
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
      {profiles.length > 0 ? (
        <Panel as="div" className="connect-rise mb-6 overflow-hidden">
          <ul className="divide-y divide-hairline">
            {profiles.map((profile) => (
              <li key={profile.href}>
                <Link
                  href={profile.href}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-hover focus-ring"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-mist text-navy">
                    <profile.icon aria-hidden className="size-4" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="text-sm font-semibold text-ink">
                      {profile.title}
                    </span>
                    <span className="text-xs text-muted">{profile.line}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
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
