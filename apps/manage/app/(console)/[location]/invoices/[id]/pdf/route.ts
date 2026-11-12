import { getCompanyDetails, getInvoice } from "@repo/db/server";
import { invoicePdf } from "../../../../../_pdf/invoice-pdf";
import { INVOICE_PDF_STATUSES } from "../../../../../_pdf/statuses";
import { requireAdmin } from "../../../../../_lib/access";

/**
 * Route: /[location]/invoices/[id]/pdf. An invoice's or a credit note's
 * PDF, for Finance, once it is issued (a void one is stamped so). See
 * ../../../../../_pdf.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/[location]/invoices/[id]/pdf">,
) {
  await requireAdmin("invoices.manage");
  const { id } = await params;
  const doc = await getInvoice(id);
  if (!doc) return new Response("This invoice is not here.", { status: 404 });
  if (!INVOICE_PDF_STATUSES.includes(doc.status)) {
    return new Response(
      "An open invoice has no PDF yet: it is made once it is issued.",
      { status: 409 },
    );
  }
  return invoicePdf(doc, await getCompanyDetails());
}
