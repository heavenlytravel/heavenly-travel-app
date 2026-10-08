/**
 * The confirm form's field names, shared by the form and its action. The
 * honeypot is named like a real field so a bot fills it; people never see
 * it. See docs/261008-guest-booking.md, "Abuse".
 */
export const CONFIRM_FIELDS = {
  category: "category",
  trip: "trip",
  name: "name",
  phone: "phone",
  email: "email",
  honeypot: "fax",
} as const;
