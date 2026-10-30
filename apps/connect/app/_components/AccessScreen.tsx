import { CONTACT } from "@repo/db";
import {
  Ban,
  Mail,
  MessageCircle,
  PauseCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { SignedIn } from "../_lib/access";
import { Button } from "@repo/ui/button";
import { BandHeading, Screen } from "../_ui/Screen";
import { STATUS_PATH } from "../_ui/nav";
import { Panel } from "../_ui/parts";

type Shut = Exclude<SignedIn, { status: "ok" }>;

/**
 * What a signed-in visitor Connect does not let in sees, one screen per
 * case: not a driver or a vendor yet, with the way to register a vendor,
 * one not approved, or one suspended. Each
 * says how to reach the team, by WhatsApp first. A vendor waiting for
 * approval goes to its status page, /status, instead.
 */
export function AccessScreen({ access }: { access: Shut }) {
  if (access.status === "pending") redirect(STATUS_PATH);
  const screen = screenOf(
    access.status,
    access.status === "register" ? null : access.vendor.name,
  );
  const Icon = screen.icon;
  return (
    <Screen
      nav={false}
      width="narrow"
      band={
        <BandHeading eyebrow={screen.eyebrow} title={screen.title}>
          {access.user.email}
        </BandHeading>
      }
    >
      <Panel className="connect-rise grid gap-5 p-6">
        <span
          className={`grid size-14 place-items-center rounded-card ${screen.iconClass}`}
        >
          <Icon aria-hidden className="size-7" />
        </span>
        <p className="text-base text-pretty text-body">{screen.text}</p>
        {access.status === "register" ? (
          <>
            <ul className="grid gap-2 text-sm text-muted">
              {[
                "Get trips in the places you serve, by class",
                "Keep your vehicles and drivers in one place",
                "Your drivers report each trip from their phone",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Sparkles
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-azure"
                  />
                  {line}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="w-full">
              <Link href="/register">Register your business</Link>
            </Button>
          </>
        ) : null}
      </Panel>
      <Panel className="grid gap-3 p-5">
        <p className="text-sm font-semibold text-ink">Talk to the team</p>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary">
            <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden className="size-4" />
              WhatsApp
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href={`mailto:${CONTACT.bookingEmail}`}>
              <Mail aria-hidden className="size-4" />
              Email
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted">
          {CONTACT.whatsappNumber} · {CONTACT.bookingEmail}
        </p>
      </Panel>
    </Screen>
  );
}

function screenOf(
  status: "register" | "refused" | "suspended",
  vendorName: string | null,
): {
  eyebrow: string;
  title: string;
  text: string;
  icon: LucideIcon;
  iconClass: string;
} {
  switch (status) {
    case "register":
      return {
        eyebrow: "Welcome to Connect",
        title: "Not on Connect yet",
        text: "A company or a person who supplies vehicles or drives registers as a vendor. Driving for a vendor already with us? Ask them to add the email you signed in with.",
        icon: Sparkles,
        iconClass: "bg-brand-tint text-brand",
      };
    case "refused":
      return {
        eyebrow: vendorName ?? "",
        title: "Not approved",
        text: "This vendor was not approved for Connect. Talk to the team if you think this is wrong.",
        icon: Ban,
        iconClass: "bg-danger-tint text-danger",
      };
    case "suspended":
      return {
        eyebrow: vendorName ?? "",
        title: "Suspended",
        text: "This vendor is suspended, so its jobs are paused. Talk to the team to know why and what happens next.",
        icon: PauseCircle,
        iconClass: "bg-hairline text-muted",
      };
  }
}
