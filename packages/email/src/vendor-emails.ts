import { consoleVendorPath } from "@repo/db";
import type { BookingEmail, EmailSettings } from "./booking-emails";
import { email, toOps } from "./booking-emails";

/**
 * The emails of a vendor's sign-up, as data. Pure, as the booking emails
 * are. The team hears of every sign-up, to review it; the vendor hears
 * once approved, that Connect is open. A refusal sends nothing: its reason
 * is staff only. See docs/261028-fulfilment-vendors-and-connect.md,
 * "Signing up".
 */

/** What the emails read of a vendor. */
export type VendorEmailFacts = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** When the move happened, for the key. */
  at: Date;
};

/** To the team: a vendor signed up and waits for SUPER's review. */
export function vendorRegisteredEmails(
  vendor: VendorEmailFacts,
  settings: EmailSettings,
): BookingEmail[] {
  const href = `${settings.adminUrl}${consoleVendorPath(vendor.id)}`;
  return [
    toOps(`vendor:${vendor.id}:registered:${vendor.at.getTime()}`, settings, {
      subject: `New vendor sign-up: ${vendor.name}`,
      heading: `${vendor.name} signed up`,
      blocks: [
        {
          type: "paragraph",
          text: `${vendor.name} signed up in Connect and waits for a SUPER admin to approve or refuse it.`,
        },
        {
          type: "rows",
          title: "Contact",
          rows: [
            ["Name", vendor.contactName],
            ["Phone", vendor.contactPhone],
            ["Email", vendor.contactEmail],
          ],
        },
        { type: "button", label: "Review in the console", href },
      ],
    }),
  ];
}

/** To the vendor: approved, Connect is open to it. */
export function vendorApprovedEmails(
  vendor: VendorEmailFacts,
  settings: EmailSettings,
): BookingEmail[] {
  return [
    email(
      vendor.contactEmail,
      `vendor:${vendor.id}:approved:${vendor.at.getTime()}`,
      {
        subject: `${vendor.name} is approved on Heavenly Travel Connect`,
        heading: "Connect is open",
        blocks: [
          {
            type: "paragraph",
            text: `Hi ${vendor.contactName}, ${vendor.name} is approved. Sign in to Connect to add your vehicles and drivers; the jobs we offer you show there to accept.`,
          },
          { type: "button", label: "Open Connect", href: settings.connectUrl },
          { type: "contact" },
        ],
      },
      settings,
    ),
  ];
}
