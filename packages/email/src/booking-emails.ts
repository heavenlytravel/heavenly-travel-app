import {
  carDetailRows,
  formatLocalDateTime,
  formatMyr,
  ITEM_STATUS_LABELS,
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
 * the environment are the entry point's concern. See docs/car-with-driver.md,
 * "Emails".
 */

/** The three moments a booking writes to someone. */
export type BookingEmailEvent = "received" | BookingEvent;

/** What differs per environment: link targets, the ops inbox, the subject prefix. */
export type EmailSettings = {
  /** The customer site, for "View booking". */
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
  if (!trip || !item.carDetails) return [];
  return [
    ...tripRows(trip),
    ...carDetailRows(item.carDetails),
    ["Price", formatMyr(item.priceTotalSen)],
  ];
}

/** One rows block per item; titled with position and status once there are several. */
function itemBlocks(booking: BookingWithItems): Block[] {
  const several = booking.items.length > 1;
  return booking.items.flatMap((item): Block[] => {
    const rows = itemRows(item);
    if (rows.length === 0) return [];
    const status = ITEM_STATUS_LABELS[item.status as ItemStatus] ?? item.status;
    const title = several ? `Item ${item.position}: ${status}` : null;
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
      ["Email", booking.user.email],
    ],
  };
}

function viewBookingButton(
  booking: BookingWithItems,
  settings: EmailSettings,
): Block {
  return {
    type: "button",
    label: "View booking",
    href: `${settings.siteUrl}/booking/${booking.reference}`,
  };
}

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

function toCustomer(
  booking: BookingWithItems,
  key: string,
  settings: EmailSettings,
  content: EmailContent,
) {
  return email(booking.user.email, `${key}:customer`, content, settings);
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
    toCustomer(booking, key, settings, {
      subject: `Booking ${ref} received`,
      heading: "We have your booking",
      blocks: [
        {
          type: "paragraph",
          text: `Hi ${booking.contactName}, thanks for booking with Heavenly Travel. Your reference is ${ref}. We will check the trip and confirm it by email shortly.`,
        },
        ...itemBlocks(booking),
        totalBlock(booking),
        viewBookingButton(booking, settings),
        { type: "contact" },
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
  return [
    toCustomer(booking, key, settings, {
      subject: `Booking ${ref} confirmed`,
      heading: "Your booking is confirmed",
      blocks: [
        {
          type: "paragraph",
          text: `Hi ${booking.contactName}, booking ${ref} is confirmed. Your driver will be ready at the pick-up on ${formatLocalDateTime(booking.startsAt)}. Please be reachable on ${booking.contactPhone} around that time.`,
        },
        ...itemBlocks(booking),
        totalBlock(booking),
        viewBookingButton(booking, settings),
        { type: "contact" },
      ],
    }),
  ];
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
      toCustomer(booking, key, settings, {
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

  return [
    toCustomer(booking, key, settings, {
      subject: whole ? `Booking ${ref} cancelled` : `Booking ${ref} updated`,
      heading: whole
        ? "Your booking is cancelled"
        : "Part of your booking is cancelled",
      blocks: [
        {
          type: "paragraph",
          text: whole
            ? `Hi ${booking.contactName}, we are sorry: we cannot provide this trip and have cancelled booking ${ref}. Message us and we will help you plan another.`
            : `Hi ${booking.contactName}, we had to cancel part of booking ${ref}. The rest goes ahead as planned; the status of each item is below. Message us if you have questions.`,
        },
        ...itemBlocks(booking),
        ...(whole
          ? []
          : [totalBlock(booking), viewBookingButton(booking, settings)]),
        { type: "contact" },
      ],
    }),
  ];
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
  }
}
