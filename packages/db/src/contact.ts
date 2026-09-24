/**
 * How customers reach ops and where ops mail arrives. One place for both
 * apps and the emails. Placeholders until ops confirms the numbers.
 * Browser-safe.
 */
export const CONTACT = {
  /** Sender and ops copy for booking emails. A Google Workspace group. */
  bookingEmail: "booking@heavenlytravel.my",
  /** The number customers message; shown in emails. */
  whatsappNumber: "+60 XX-XXX XXXX",
  /** The link behind that number, in wa.me form. */
  whatsappHref: "https://wa.me/60XXXXXXXXX",
} as const;
