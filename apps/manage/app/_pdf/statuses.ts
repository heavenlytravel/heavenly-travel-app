/**
 * When a document has a PDF (./booking-pdf, ./invoice-pdf), for the
 * pages that offer it and the routes that make it: a booking once
 * confirmed or completed, an invoice or credit note once issued, and a
 * void one, stamped so.
 */
export const BOOKING_PDF_STATUSES: readonly string[] = [
  "confirmed",
  "completed",
];

export const INVOICE_PDF_STATUSES: readonly string[] = ["issued", "void"];
