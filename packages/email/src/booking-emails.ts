import {
  accountBookingPath,
  bookingPath,
  customerEmailOf,
  formatLocalDateTime,
  formatMyr,
  ITEM_STATUS_LABELS,
  itemHeading,
  signUpPath,
  tripDetailRows,
  tripHeadline,
  tripRows,
  tripViewOfItem,
  type Canceller,
  type DetailRow,
  type ItemStatus,
} from "@repo/db";
import type {
  BookingEvent,
  BookingItemWithDetails,
  BookingWithItems,
} from "@repo/db/server";
import {
  renderHtml,
  renderText,
  type Block,
  type EmailContent,
} from "./render";
import type { EmailMessage } from "./types";

/**
 * The booking emails, one function per event, as data. Pure: the sender and
 * the environment are the entry point's concern. See docs/260923-car-with-driver.md,
 * "Emails".
 */

/** The moments a booking writes to someone. */
export type BookingEmailEvent = "received" | BookingEvent;

/** What differs per environment: link targets, the ops inbox, the subject prefix. */
export type EmailSettings = {
  /** The customer site, for "View booking" and "Manage booking online". */
  siteUrl: string;
  /** The admin console, for "Open in console". */
  adminUrl: string;
  /** Where the ops copies go. */
  opsTo: string;
  /** "[Development] " outside production, so the environment is obvious. */
  subjectPrefix: string;
};

/** A message and the key that makes sending it twice harmless. */
export type BookingEmail = { key: string; message: EmailMessage };

function itemRows(item: BookingItemWithDetails): DetailRow[] {
  const trip = tripViewOfItem(item);
  if (!trip || !item.tripDetails) return [];
  return [
    ...tripRows(trip),
    ...tripDetailRows(item.tripDetails),
    ["Price", formatMyr(item.priceTotalSen)],
  ];
}

/**
 * One rows block per item, titled with what the item is: "Coach charter".
 * Once there are several, the position and the status join it: "Item 2:
 * Coach charter (Cancelled)".
 */
function itemBlocks(booking: BookingWithItems): Block[] {
  const several = booking.items.length > 1;
  return booking.items.flatMap((item): Block[] => {
    const rows = itemRows(item);
    if (rows.length === 0) return [];
    const heading = itemHeading(item);
    const status = ITEM_STATUS_LABELS[item.status as ItemStatus] ?? item.status;
    const title = several
      ? `Item ${item.position}: ${heading} (${status})`
      : heading;
    return [{ type: "rows", title, rows }];
  });
}

function totalBlock(booking: BookingWithItems): Block {
  return {
    type: "rows",
    title: null,
    rows: [["Total", formatMyr(booking.priceTotalSen)]],
  };
}

function customerBlock(booking: BookingWithItems): Block {
  return {
    type: "rows",
    title: "Customer",
    rows: [
      ["Name", booking.contactName],
      ["Phone", booking.contactPhone],
      ["Email", customerEmailOf(booking) ?? "None given"],
    ],
  };
}

/** The one line that offers a guest an account, never more. */
const ACCOUNT_OFFER =
  "Verify your email once to see updates and cancel online.";

/**
 * Where the customer goes from the email: an account holder to the booking
 * page; a guest to sign-up with their email filled in, which claims the
 * booking and lands under My bookings, with the account offer above it.
 * See docs/261008-guest-booking.md, "The account offer".
 */
function bookingButton(
  booking: BookingWithItems,
  settings: EmailSettings,
): Block[] {
  const email = customerEmailOf(booking);
  if (booking.userId === null && email) {
    return [
      { type: "paragraph", text: ACCOUNT_OFFER },
      {
        type: "button",
        label: "Manage booking online",
        href: `${settings.siteUrl}${signUpPath(email, accountBookingPath(booking.reference))}`,
      },
    ];
  }
  return [
    {
      type: "button",
      label: "View booking",
      href: `${settings.siteUrl}${bookingPath(booking.reference)}`,
    },
  ];
}

/** On every received email: an address nobody booked with can get it removed. */
const NOT_YOU: Block = {
  type: "note",
  text: "Didn't make this booking? Reply to this email and we will remove it.",
};

function consoleButton(
  booking: BookingWithItems,
  settings: EmailSettings,
): Block {
  return {
    type: "button",
    label: "Open in console",
    href: `${settings.adminUrl}/bookings/${booking.id}`,
  };
}

/** "KLIA Terminal 1 to Kuala Lumpur", or the reference when no trip can be read. */
function headline(booking: BookingWithItems) {
  const trip = booking.items.map(tripViewOfItem).find((t) => t !== null);
  return trip ? tripHeadline(trip) : booking.reference;
}

function email(
  to: string,
  key: string,
  content: EmailContent,
  settings: EmailSettings,
): BookingEmail {
  return {
    key,
    message: {
      to,
      subject: `${settings.subjectPrefix}${content.subject}`,
      html: renderHtml(content),
      text: renderText(content),
    },
  };
}

/**
 * The customer's copy, or none for a guest who gave no email: the ops copy
 * is then the only record, and the team reaches them by phone.
 */
function toCustomer(
  booking: BookingWithItems,
  key: string,
  settings: EmailSettings,
  content: EmailContent,
): BookingEmail[] {
  const to = customerEmailOf(booking);
  return to ? [email(to, `${key}:customer`, content, settings)] : [];
}

function toOps(key: string, settings: EmailSettings, content: EmailContent) {
  return email(settings.opsTo, `${key}:ops`, content, settings);
}

function received(
  booking: BookingWithItems,
  settings: EmailSettings,
  key: string,
): BookingEmail[] {
  const ref = booking.reference;
  return [
    ...toCustomer(booking, key, settings, {
      subject: `Booking ${ref} received`,
      heading: "We have your booking",
      blocks: [
        {
          type: "paragraph",
          text: `Hi ${booking.contactName}, thanks for booking with Heavenly Travel. Your reference is ${ref}. We will check the trip and confirm it by email shortly.`,
        },
        ...itemBlocks(booking),
        totalBlock(booking),
        ...bookingButton(booking, settings),
        { type: "contact" },
        NOT_YOU,
      ],
    }),
    toOps(key, settings, {
      subject: `New booking ${ref}`,
      heading: `New booking: ${headline(booking)}`,
      blocks: [
        {
          type: "paragraph",
          text: `${booking.contactName} booked ${ref}. It is waiting to be confirmed.`,
        },
        customerBlock(booking),
        ...itemBlocks(booking),
        totalBlock(booking),
        consoleButton(booking, settings),
      ],
    }),
  ];
}

function confirmed(
  booking: BookingWithItems,
  settings: EmailSettings,
  key: string,
): BookingEmail[] {
  const ref = booking.reference;
  return toCustomer(booking, key, settings, {
    subject: `Booking ${ref} confirmed`,
    heading: "Your booking is confirmed",
    blocks: [
      {
        type: "paragraph",
        text: `Hi ${booking.contactName}, booking ${ref} is confirmed. Your driver will be ready at the pick-up on ${formatLocalDateTime(booking.startsAt)}. Please be reachable on ${booking.contactPhone} around that time.`,
      },
      ...itemBlocks(booking),
      totalBlock(booking),
      ...bookingButton(booking, settings),
      { type: "contact" },
    ],
  });
}

function cancelled(
  booking: BookingWithItems,
  settings: EmailSettings,
  key: string,
): BookingEmail[] {
  const ref = booking.reference;
  // The booking records who cancelled it only once it is fully cancelled.
  // A partial cancel leaves it live, and only admins can do that.
  const by: Canceller =
    booking.cancelledBy === "customer" ? "customer" : "admin";
  const whole = booking.status === "cancelled";

  if (by === "customer") {
    return [
      ...toCustomer(booking, key, settings, {
        subject: `Booking ${ref} cancelled`,
        heading: "Your booking is cancelled",
        blocks: [
          {
            type: "paragraph",
            text: `Hi ${booking.contactName}, you cancelled booking ${ref}. There is nothing more to do. If this was a mistake, message us and we will help you book again.`,
          },
          ...itemBlocks(booking),
          { type: "contact" },
        ],
      }),
      toOps(key, settings, {
        subject: `Booking ${ref} cancelled by the customer`,
        heading: `Cancelled by the customer: ${headline(booking)}`,
        blocks: [
          {
            type: "paragraph",
            text: `${booking.contactName} cancelled ${ref}. No driver is needed.`,
          },
          customerBlock(booking),
          ...itemBlocks(booking),
          consoleButton(booking, settings),
        ],
      }),
    ];
  }

  if (!whole) {
    return updated(
      booking,
      settings,
      key,
      "Part of your booking is cancelled",
      `Hi ${booking.contactName}, we had to cancel part of booking ${ref}. The rest goes ahead as planned; the status of each item is below. Message us if you have questions.`,
    );
  }
  return toCustomer(booking, key, settings, {
    subject: `Booking ${ref} cancelled`,
    heading: "Your booking is cancelled",
    blocks: [
      {
        type: "paragraph",
        text: `Hi ${booking.contactName}, we are sorry: we cannot provide this trip and have cancelled booking ${ref}. Message us and we will help you plan another.`,
      },
      ...itemBlocks(booking),
      { type: "contact" },
    ],
  });
}

/**
 * "Booking updated", to the customer: every item with its status and the
 * new total, after a change made by staff that leaves the booking live. A
 * partial cancel and an amend both send it, each with its own words.
 */
function updated(
  booking: BookingWithItems,
  settings: EmailSettings,
  key: string,
  heading: string,
  text: string,
): BookingEmail[] {
  return toCustomer(booking, key, settings, {
    subject: `Booking ${booking.reference} updated`,
    heading,
    blocks: [
      { type: "paragraph", text },
      ...itemBlocks(booking),
      totalBlock(booking),
      ...bookingButton(booking, settings),
      { type: "contact" },
    ],
  });
}

function amended(
  booking: BookingWithItems,
  settings: EmailSettings,
  key: string,
): BookingEmail[] {
  return updated(
    booking,
    settings,
    key,
    "Your booking is updated",
    `Hi ${booking.contactName}, we have updated booking ${booking.reference} as agreed. The trip is now as below; please check the pick-up time and place. Message us if anything is not right.`,
  );
}

/**
 * The emails an event sends, each with an idempotency key built from the
 * booking, the event and the write that caused it, so a retried request
 * cannot deliver the same email twice.
 */
export function bookingEmails(
  event: BookingEmailEvent,
  booking: BookingWithItems,
  settings: EmailSettings,
): BookingEmail[] {
  const key = `${booking.id}:${event}:${booking.updatedAt.getTime()}`;
  switch (event) {
    case "received":
      return received(booking, settings, key);
    case "confirmed":
      return confirmed(booking, settings, key);
    case "cancelled":
      return cancelled(booking, settings, key);
    case "amended":
      return amended(booking, settings, key);
  }
}
