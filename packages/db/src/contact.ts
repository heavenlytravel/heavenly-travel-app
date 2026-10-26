/**
 * How customers reach ops and where ops mail arrives. One place for both
 * apps and the emails. The footer and Contact us show the company's details
 * as SUPER writes them in the footer (./footer-content). The WhatsApp number is the one the WordPress site
 * links to, put in on 2026-10-25 until ops confirms it (OP0-01).
 * Browser-safe.
 */
export const CONTACT = {
  /** Sender and ops copy for booking emails. A Google Workspace group. */
  bookingEmail: "booking@heavenlytravel.my",
  /** The number customers message; shown in emails. */
  whatsappNumber: "+60 12-527 8808",
  /** The link behind that number, in wa.me form. */
  whatsappHref: "https://wa.me/60125278808",
} as const;
