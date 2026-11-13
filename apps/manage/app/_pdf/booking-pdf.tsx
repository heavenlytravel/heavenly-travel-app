import "server-only";
import {
  BOOKING_STATUS_LABELS,
  bookingLabelOf,
  formatDocumentNumber,
  formatLocalDate,
  formatLocalDateTime,
  formatMyr,
  isBookingStatus,
  isItemStatus,
  ITEM_STATUS_LABELS,
  PART_ROLE_LABELS,
  PART_ROLES,
  partNamedOf,
  tripDetailRows,
  tripRows,
  tripViewOfItem,
  CONTACT,
} from "@repo/db";
import type {
  BookingWithItems,
  CompanyDetails,
  FulfilmentTrip,
} from "@repo/db/server";
import {
  PdfNote,
  PdfPage,
  PdfRows,
  PdfSection,
  PdfTable,
  pdfResponse,
} from "./parts";

/**
 * A booking's PDF, for the team to send or keep once it is confirmed or
 * completed: who it is for, each trip as booked (where, when, the vehicle,
 * the group, the guide, the flight) and who does it once assigned, then
 * what it costs, trip by trip and its charges. A cancelled trip is listed
 * as cancelled. Its HTQ shows under its HTB when it was received first.
 */
export function bookingPdf(
  booking: BookingWithItems,
  trips: readonly FulfilmentTrip[],
  company: CompanyDetails,
): Promise<Response> {
  const label = bookingLabelOf(booking);
  const status = isBookingStatus(booking.status)
    ? BOOKING_STATUS_LABELS[booking.status]
    : booking.status;
  const items = [...booking.items].sort((a, b) => a.position - b.position);

  const page = (
    <PdfPage
      company={company}
      title="Booking Confirmation"
      number={label}
      under={[
        ...(booking.number !== null && booking.quoteNumber !== null
          ? [`Quotation ${formatDocumentNumber("quote", booking.quoteNumber)}`]
          : []),
        `Booked ${formatLocalDate(booking.createdAt)}`,
        status,
      ]}
    >
      <PdfSection heading="Customer">
        <PdfRows
          rows={[
            ["Name", booking.contactName],
            ["Phone", booking.contactPhone],
            ["Email", booking.contactEmail],
            ["Agent", booking.business?.name],
          ]}
        />
      </PdfSection>

      {items.map((item) => {
        const view = tripViewOfItem(item);
        const crew = trips.find((t) => t.id === item.id);
        const itemStatus = isItemStatus(item.status)
          ? ITEM_STATUS_LABELS[item.status]
          : item.status;
        return (
          <PdfSection
            key={item.id}
            heading={`Trip ${item.position} · ${itemStatus}`}
          >
            <PdfRows
              rows={[
                ...(view
                  ? tripRows(view).map(
                      ([rowLabel, value]) =>
                        [
                          rowLabel,
                          typeof value === "string" ? value : value.label,
                        ] as const,
                    )
                  : [
                      [
                        "Pick-up Time",
                        formatLocalDateTime(item.startsAt),
                      ] as const,
                    ]),
                // The class booked, apart from the vehicle assigned under it.
                ...(item.tripDetails
                  ? tripDetailRows(item.tripDetails).map(
                      ([rowLabel, value]) =>
                        [
                          rowLabel === "Vehicle" ? "Class" : rowLabel,
                          value,
                        ] as const,
                    )
                  : []),
                ...PART_ROLES.map((role) => {
                  const part = crew?.parts.find((p) => p.role === role);
                  return [
                    PART_ROLE_LABELS[role],
                    part ? partNamedOf(part) : null,
                  ] as const;
                }),
              ]}
            />
          </PdfSection>
        );
      })}

      <PdfSection heading="Price" breaks>
        <PdfTable
          columns={[
            { heading: "Item", flex: 4 },
            { heading: "Amount", flex: 1, right: true },
          ]}
          rows={[
            ...items.map((item) => [
              `Trip ${item.position}${item.status === "cancelled" ? " (cancelled)" : ""}`,
              item.status === "cancelled" ? "—" : formatMyr(item.priceTotalSen),
            ]),
            ...booking.charges.map((charge) => [
              charge.label,
              formatMyr(charge.amountSen),
            ]),
          ]}
          totals={[["Total", formatMyr(booking.priceTotalSen)]]}
        />
      </PdfSection>
      <PdfNote>
        Questions about this booking: WhatsApp {CONTACT.whatsappNumber} or email{" "}
        {CONTACT.bookingEmail}, quoting {label}.
      </PdfNote>
    </PdfPage>
  );
  return pdfResponse(page, {
    title: `Booking ${label}`,
    fileName: label,
  });
}
