import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getConnectAccess, listRegistrationLocations } from "@repo/db/server";
import { BadgeCheck, CarFront, Smartphone } from "lucide-react";
import { HOME_PATH, STATUS_PATH } from "../_ui/nav";
import { Panel } from "../_ui/parts";
import { BandHeading, Screen } from "../_ui/Screen";
import { RegisterFlow } from "./RegisterFlow";

export const metadata: Metadata = { title: "Register your business | Connect" };

/** What happens after the registration, beside the form. */
const STEPS = [
  {
    icon: BadgeCheck,
    title: "We check and approve you",
    text: "We look at every registration by hand, and email you once Connect opens.",
  },
  {
    icon: CarFront,
    title: "Add your vehicles and drivers",
    text: "We offer you jobs of their classes, where they are based.",
  },
  {
    icon: Smartphone,
    title: "Take jobs and get paid",
    text: "Accept an offer with what we pay; your driver reports the trip from their phone.",
  },
];

/**
 * Route: /register. The way into Connect for a vendor: the whole form,
 * then the code that confirms the email and makes the account, and the
 * registration with it (RegisterFlow). A visitor signed out fills it all;
 * an account signed in with no business sends it as itself. An account
 * that registered a business already goes to its status page, and one
 * that Connect lets in to Connect. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Connect".
 */
export default async function RegisterPage() {
  const access = await getConnectAccess();
  if (access.status === "pending") redirect(STATUS_PATH);
  if (access.status !== "signed-out" && access.status !== "register") {
    redirect(HOME_PATH);
  }
  const locations = await listRegistrationLocations();
  const user = access.status === "register" ? access.user : null;
  return (
    <Screen
      nav={false}
      account={user !== null}
      back={{ href: "/", label: "Back" }}
      asideFirst
      aside={
        <Panel className="connect-rise grid gap-5 p-5">
          <ol className="grid gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-control bg-brand-tint text-brand">
                  <step.icon aria-hidden className="size-5" />
                  <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-ink text-[0.6rem] font-bold text-white">
                    {index + 1}
                  </span>
                </span>
                <span className="grid gap-0.5">
                  <span className="font-semibold text-ink">{step.title}</span>
                  <span className="text-sm text-muted">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {user ? null : (
            <p className="border-t border-hairline pt-4 text-sm text-muted">
              Registered already, or driving for a vendor?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-brand underline-offset-4 hover:underline focus-ring"
              >
                Sign in
              </Link>
            </p>
          )}
        </Panel>
      }
      band={
        <BandHeading
          eyebrow="Heavenly Travel Connect"
          title="Register your business"
        >
          Fill it all in, then confirm your email with a code. A driver for a
          vendor already with us doesn&rsquo;t register: their vendor adds them.
        </BandHeading>
      }
    >
      <RegisterFlow
        signedIn={
          user
            ? {
                email: user.email,
                firstName: user.firstName ?? "",
                lastName: user.lastName ?? "",
              }
            : null
        }
        locations={locations}
      />
    </Screen>
  );
}
