import "server-only";
import {
  CONTACT,
  formatLocalDate,
  formatMyr,
  PAYMENT_STATE_LABELS,
} from "@repo/db";
import type { CompanyDetails, InvoicePage } from "@repo/db/server";
import { View } from "@react-pdf/renderer";
import {
  PdfNote,
  PdfPage,
  PdfRows,
  PdfSection,
  PdfTable,
  pdfResponse,
} from "./parts";

/**
 * An invoice's or a credit note's PDF, once issued: who it is billed to,
 * its lines by booking, its total, and for an invoice what was paid and
 * what is left, stamped Paid once nothing is, Void once voided.
 */
export function invoicePdf(
  doc: InvoicePage,
  company: CompanyDetails,
): Promise<Response> {
  const credit = doc.type === "credit";
  const stamp =
    doc.status === "void"
      ? { text: "VOID", tone: "danger" as const }
      : doc.money?.state === "paid"
        ? { text: "PAID", tone: "success" as const }
        : null;
  const money = doc.money;

  const page = (
    <PdfPage
      company={company}
      title={credit ? "Credit note" : "Invoice"}
      number={doc.label}
      under={[
        ...(doc.issuedAt ? [`Issued ${formatLocalDate(doc.issuedAt)}`] : []),
        ...(doc.dueAt && !credit ? [`Due ${formatLocalDate(doc.dueAt)}`] : []),
        ...(doc.credits ? [`Against ${doc.credits.label}`] : []),
      ]}
      stamp={stamp}
    >
      <PdfSection heading="Billed to">
        <PdfRows
          rows={[
            ["Name", doc.billTo.name],
            ["Registration", doc.billTo.registrationNo],
            ["Address", doc.billTo.address],
            ["Email", doc.billTo.email],
            ["Phone", doc.billTo.phone],
            ["Period", doc.period],
          ]}
        />
      </PdfSection>

      <PdfSection heading={credit ? "Credited" : "Charges"} breaks>
        <PdfTable
          columns={[
            { heading: "Booking", flex: 1.2 },
            { heading: "Pick-up", flex: 1.1 },
            { heading: "Description", flex: 3.5 },
            { heading: "Amount", flex: 1.2, right: true },
          ]}
          rows={doc.lines.map((line) => [
            `${line.booking}\n${line.contactName}`,
            formatLocalDate(line.startsAt),
            line.description,
            formatMyr(line.amountSen),
          ])}
          totals={[
            ["Total", formatMyr(doc.totalSen)],
            ...(money && !credit
              ? ([
                  ...(money.netSen !== doc.totalSen
                    ? [["After credit notes", formatMyr(money.netSen)]]
                    : []),
                  ["Paid", formatMyr(money.paidSen)],
                  ["Balance", formatMyr(Math.max(0, money.balanceSen))],
                ] as [string, string][])
              : []),
          ]}
        />
      </PdfSection>

      <View>
        {doc.status === "void" ? (
          <PdfNote>
            Void{doc.voidedAt ? ` since ${formatLocalDate(doc.voidedAt)}` : ""}
            {doc.voidReason ? `: ${doc.voidReason}` : ""}.
            {doc.replacedBy ? ` Replaced by ${doc.replacedBy.label}.` : ""}
          </PdfNote>
        ) : money && !credit ? (
          <PdfNote>
            {PAYMENT_STATE_LABELS[money.state]}. Questions about this invoice:
            WhatsApp {CONTACT.whatsappNumber} or email {CONTACT.bookingEmail},
            quoting {doc.label}.
          </PdfNote>
        ) : null}
      </View>
    </PdfPage>
  );
  return pdfResponse(page, {
    title: `${credit ? "Credit note" : "Invoice"} ${doc.label}`,
    fileName: doc.label,
  });
}
