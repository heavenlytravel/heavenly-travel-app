import { CONTACT } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/console/Card";
import Link from "next/link";
import type { SignedIn } from "../_lib/access";

type Shut = Exclude<SignedIn, { status: "ok" }>;

/**
 * What a signed-in visitor Connect does not let in sees, one screen per
 * case, as the admin shows "No admin access": not a driver or a vendor
 * yet, with the way to register a vendor, a vendor waiting for approval, one not approved, or one suspended.
 * Each says how to reach the team.
 */
export function AccessScreen({ access }: { access: Shut }) {
  const { title, text } = screenOf(access);
  return (
    <Card className="grid gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-slate-600">{text}</p>
      {access.status === "register" ? (
        <div>
          <Button asChild size="lg">
            <Link href="/register">Register as a vendor</Link>
          </Button>
        </div>
      ) : null}
      <p className="text-sm text-slate-600">
        WhatsApp{" "}
        <a
          href={CONTACT.whatsappHref}
          className="font-medium text-slate-900 underline underline-offset-4"
        >
          {CONTACT.whatsappNumber}
        </a>{" "}
        or email{" "}
        <a
          href={`mailto:${CONTACT.bookingEmail}`}
          className="font-medium text-slate-900 underline underline-offset-4"
        >
          {CONTACT.bookingEmail}
        </a>
        .
      </p>
    </Card>
  );
}

function screenOf(access: Shut): { title: string; text: string } {
  switch (access.status) {
    case "register":
      return {
        title: "Not on Connect yet",
        text: `${access.user.email} is not a driver or a vendor on Heavenly Travel yet. A company or a person who supplies vehicles or drives registers as a vendor. A driver for a vendor already with us signs in with the email their vendor has for them; ask them to add it.`,
      };
    case "pending":
      return {
        title: "Waiting for approval",
        text: `${access.vendor.name} has signed up. We check every vendor before Connect opens to it, and email you once it does.`,
      };
    case "refused":
      return {
        title: "Not approved",
        text: `${access.vendor.name} was not approved for Connect. Talk to the team if you think this is wrong.`,
      };
    case "suspended":
      return {
        title: "Suspended",
        text: `${access.vendor.name} is suspended, so its jobs are paused. Talk to the team to know why and what happens next.`,
      };
  }
}
