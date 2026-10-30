import { CONTACT } from "@repo/db";
import {
  Ban,
  Hourglass,
  Mail,
  MessageCircle,
  PauseCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { SignedIn } from "../_lib/access";
import { buttonClass } from "../_ui/button";
import { BandHeading, Screen } from "../_ui/Screen";
import { Panel } from "../_ui/parts";

type Shut = Exclude<SignedIn, { status: "ok" }>;

/**
 * What a signed-in visitor Connect does not let in sees, one screen per
 * case: not a driver or a vendor yet, with the way to register a vendor,
 * a vendor waiting for approval, one not approved, or one suspended. Each
 * says how to reach the team, by WhatsApp first.
 */
export function AccessScreen({ access }: { access: Shut }) {
  const screen = screenOf(access);
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
          className={`grid size-14 place-items-center rounded-2xl ${screen.iconClass}`}
        >
          <Icon aria-hidden className="size-7" />
        </span>
        <p className="text-base text-pretty text-slate-700">{screen.text}</p>
        {access.status === "register" ? (
          <>
            <ul className="grid gap-2 text-sm text-slate-600">
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
            <Link
              href="/register"
              className={buttonClass({ size: "lg", className: "w-full" })}
            >
              Register as a vendor
            </Link>
          </>
        ) : null}
      </Panel>
      <Panel className="grid gap-3 p-5">
        <p className="text-sm font-semibold text-ink">Talk to the team</p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={CONTACT.whatsappHref}
            className={buttonClass({ variant: "soft" })}
          >
            <MessageCircle aria-hidden className="size-4" />
            WhatsApp
          </a>
          <a
            href={`mailto:${CONTACT.bookingEmail}`}
            className={buttonClass({ variant: "soft" })}
          >
            <Mail aria-hidden className="size-4" />
            Email
          </a>
        </div>
        <p className="text-xs text-slate-500">
          {CONTACT.whatsappNumber} · {CONTACT.bookingEmail}
        </p>
      </Panel>
    </Screen>
  );
}

function screenOf(access: Shut): {
  eyebrow: string;
  title: string;
  text: string;
  icon: LucideIcon;
  iconClass: string;
} {
  switch (access.status) {
    case "register":
      return {
        eyebrow: "Welcome to Connect",
        title: "Not on Connect yet",
        text: "A company or a person who supplies vehicles or drives registers as a vendor. Driving for a vendor already with us? Ask them to add the email you signed in with.",
        icon: Sparkles,
        iconClass: "bg-brand-tint text-brand",
      };
    case "pending":
      return {
        eyebrow: access.vendor.name,
        title: "Waiting for approval",
        text: "We check every vendor before Connect opens to it, and email you as soon as it does.",
        icon: Hourglass,
        iconClass: "bg-amber-100 text-amber-700",
      };
    case "refused":
      return {
        eyebrow: access.vendor.name,
        title: "Not approved",
        text: "This vendor was not approved for Connect. Talk to the team if you think this is wrong.",
        icon: Ban,
        iconClass: "bg-red-100 text-red-700",
      };
    case "suspended":
      return {
        eyebrow: access.vendor.name,
        title: "Suspended",
        text: "This vendor is suspended, so its jobs are paused. Talk to the team to know why and what happens next.",
        icon: PauseCircle,
        iconClass: "bg-slate-200 text-slate-700",
      };
  }
}
