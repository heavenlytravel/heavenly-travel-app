import { entriesSeenBy } from "@repo/db";
import { getInvoice, listActivityFor } from "@repo/db/server";
import { Streamed } from "@repo/console/Skeleton";
import { notFound } from "next/navigation";
import {
  RecordHistory,
  RecordHistorySkeleton,
} from "../../../../../_components/RecordHistory";
import { getPermissions, requireAdmin } from "../../../../../_lib/access";
import { invoiceHref } from "../../../../../_lib/routes";
import { scopeOf } from "../../../../../_lib/scope";

/**
 * Route: /~/invoices/[id]/history. One invoice's history: issued,
 * payments recorded and reversed, voided.
 */
export default async function InvoiceHistoryPage({
  params,
}: PageProps<"/[location]/invoices/[id]/history">) {
  await requireAdmin("invoices.manage");
  const [scope, { id }] = await Promise.all([scopeOf(params), params]);
  if (scope.slug !== null) notFound();
  return (
    <Streamed fallback={<RecordHistorySkeleton />}>
      {() => invoiceHistory(id)}
    </Streamed>
  );
}

async function invoiceHistory(id: string) {
  const [doc, entries, permissions] = await Promise.all([
    getInvoice(id),
    listActivityFor("invoice", id),
    getPermissions(),
  ]);
  if (!doc) notFound();
  return (
    <RecordHistory
      record={{ href: invoiceHref(id), label: doc.label }}
      entries={entriesSeenBy(entries, permissions)}
      emptyMessage="Nothing recorded yet."
    />
  );
}
