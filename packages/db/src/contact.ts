/**
 * How customers reach ops and where ops mail arrives. One place for both
 * apps and the emails. The WhatsApp number is the one the WordPress site
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

/**
 * The company as the site's footer and contact page name it: its legal
 * name and registration, its office, and where to find it. Taken from the
 * WordPress site's footer on 2026-10-25, to be confirmed (OP0-16).
 * Browser-safe.
 */
export const COMPANY = {
  legalName: "Heavenly Travel Sdn Bhd",
  /** The SSM number, new format then old. */
  registration: "202301000086 (1494005-W)",
  /** The office, one line each. */
  address: [
    "No 10-3, Langkawi City",
    "Jalan Mahawangsa 1, Kuah",
    "07000 Langkawi, Kedah",
  ],
  phone: "012-527 8808",
  phoneHref: "tel:+60125278808",
  email: "sales@heavenlytravel.my",
  /** The first year of the copyright line. */
  since: 2024,
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61573692009972",
    instagram: "https://www.instagram.com/heavenlytravellangkawi/",
    x: "https://twitter.com/HEHMalaysia",
  },
} as const;
