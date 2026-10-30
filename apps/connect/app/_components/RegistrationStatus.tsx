import {
  CONTACT,
  VENDOR_FIELD_LABELS,
  VENDOR_KIND_LABELS,
  VENDOR_SERVICE_LABELS,
  formatLocalDate,
  isVendorKind,
  vendorServicesOf,
} from "@repo/db";
import { getVendor } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Rows } from "@repo/ui/rows";
import { cx } from "@repo/ui/cx";
import { Check, Hourglass, Mail, MessageCircle, Sparkles } from "lucide-react";
import { Panel } from "../_ui/parts";
import { BandHeading, Screen } from "../_ui/Screen";

/**
 * The status page of a registration waiting for approval (S1): where it
 * stands, sent, being checked, then Connect opening; what was sent; and how
 * to reach the team. Nothing of Connect opens before the approval: this is
 * what its owner sees, at /status, until then. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Connect".
 */
export async function RegistrationStatus({
  vendorId,
  vendorName,
  email,
}: {
  vendorId: string;
  vendorName: string;
  /** The owner's account email, where the approval is written to. */
  email: string;
}) {
  const vendor = await getVendor(vendorId);
  const sentOn = vendor ? formatLocalDate(vendor.createdAt) : null;
  const steps = [
    {
      title: "Registration sent",
      text: sentOn ? `On ${sentOn}.` : "We have it.",
      state: "done" as const,
    },
    {
      title: "We're checking it",
      text: "We look at every vendor by hand, and WhatsApp you if we need anything else.",
      state: "now" as const,
    },
    {
      title: "Connect opens",
      text: `We email ${email} the moment it does. Then add your vehicles and drivers, and offers start coming.`,
      state: "next" as const,
    },
  ];

  return (
    <Screen
      nav={false}
      width="narrow"
      band={
        <BandHeading eyebrow={vendorName} title="Waiting for approval">
          {email}
        </BandHeading>
      }
    >
      <Panel className="connect-rise p-6">
        <h2 className="text-base font-semibold text-ink">Where it stands</h2>
        <ol className="mt-5 grid gap-0">
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cx(
                    "absolute top-9 bottom-1 left-[1.0625rem] w-px",
                    step.state === "done" ? "bg-success" : "bg-card-edge",
                  )}
                />
              ) : null}
              <span
                className={cx(
                  "grid size-9 shrink-0 place-items-center rounded-full",
                  step.state === "done" && "bg-success text-white",
                  step.state === "now" && "bg-warning-soft text-warning",
                  step.state === "next" && "bg-hairline text-muted",
                )}
              >
                {step.state === "done" ? (
                  <Check aria-hidden className="size-4" />
                ) : step.state === "now" ? (
                  <Hourglass aria-hidden className="size-4" />
                ) : (
                  <Sparkles aria-hidden className="size-4" />
                )}
              </span>
              <span className="grid gap-0.5 pt-1.5">
                <span className="font-semibold text-ink">
                  {step.title}
                  {step.state === "now" ? (
                    <span className="sr-only"> (now)</span>
                  ) : null}
                </span>
                <span className="text-sm text-muted">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      {vendor ? (
        <Panel className="p-6">
          <h2 className="text-base font-semibold text-ink">What you sent</h2>
          <Rows
            className="mt-4"
            rows={[
              [VENDOR_FIELD_LABELS.name, vendor.name],
              [
                VENDOR_FIELD_LABELS.kind,
                isVendorKind(vendor.kind)
                  ? VENDOR_KIND_LABELS[vendor.kind]
                  : vendor.kind,
              ],
              ...(vendor.registrationNo
                ? [
                    [
                      VENDOR_FIELD_LABELS.registrationNo,
                      vendor.registrationNo,
                    ] as [string, string],
                  ]
                : []),
              [VENDOR_FIELD_LABELS.contactName, vendor.contactName],
              [VENDOR_FIELD_LABELS.contactPhone, vendor.contactPhone],
              [
                VENDOR_FIELD_LABELS.services,
                vendorServicesOf(vendor.services)
                  .map((service) => VENDOR_SERVICE_LABELS[service])
                  .join(", ") || "None yet",
              ],
              [
                VENDOR_FIELD_LABELS.locationIds,
                vendor.locations.map((location) => location.name).join(", ") ||
                  "None yet",
              ],
            ]}
          />
          <p className="mt-4 text-xs text-muted">
            Something to change? Tell the team; they update it as they check.
          </p>
        </Panel>
      ) : null}

      <Panel className="grid gap-3 p-6">
        <h2 className="text-base font-semibold text-ink">Talk to the team</h2>
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
