import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookingLabelOf,
  entriesSeenBy,
  formatLocalDateTime,
  formatMyr,
  isPaymentTerms,
  PAYMENT_TERMS_HINTS,
  PAYMENT_TERMS_LABELS,
  type BusinessProfile,
} from "@repo/db";
import {
  getBusiness,
  listActivityFor,
  listBookings,
  listBusinessInvoices,
  type Business,
} from "@repo/db/server";
import { Card, CardTitle, CARD_LINK } from "@repo/console/Card";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import {
  BookingStatusBadge,
  BusinessStatusBadge,
} from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import { Rows } from "@repo/ui/rows";
import type { ReactNode } from "react";
import { InvoiceTable } from "../../../../_components/InvoiceTable";
import {
  HistoryCard,
  HistoryLink,
} from "../../../../_components/RecordHistory";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  agentHref,
  bookingHref,
  bookingsHref,
  recordHistoryHref,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import {
  AddAgentForm,
  AgentStatusControl,
  ChangeTermsControl,
  EditAgentControl,
} from "../_components/AgentControls";

/**
 * Route: /~/agents/[id], and /~/agents/new to add one. An agent's page:
 * what is not invoiced yet, with its total and, on credit, the month-end
 * run for its last ended period; its invoices; its latest bookings by
 * HTB number; beside them its details, its payment terms and its history.
 * Finance bills a booking alone, makes the run and changes the terms;
 * those who add agents correct its details. Console-wide.
 */
export default async function AgentPage({
  params,
}: PageProps<"/[location]/agents/[id]">) {
  await requireAdmin("bookings.view");
  const [scope, { id }] = await Promise.all([scopeOf(params), params]);
  if (scope.slug !== null) notFound();
  if (id === "new") {
    await requireAdmin("agents.manage");
    return (
      <>
        <PageHeader title="Add Agent" />
        <AddAgentForm />
      </>
    );
  }
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<CardSkeleton rows={6} />}
            side={<CardSkeleton rows={5} />}
          />
        </>
      }
    >
      {() => agentScreen(id)}
    </Streamed>
  );
}

function profileOf(agent: Business): BusinessProfile {
  return {
    name: agent.name,
    registrationNo: agent.registrationNo,
    contactName: agent.contactName,
    contactPhone: agent.contactPhone,
    contactEmail: agent.contactEmail,
    address: agent.address,
  };
}

async function agentScreen(id: string) {
  const agent = await getBusiness(id);
  if (!agent) notFound();
  const [permissions, invoices, bookings, entries] = await Promise.all([
    getPermissions(),
    listBusinessInvoices(id),
    listBookings({ businessId: id }, { take: 10 }),
    listActivityFor("business", id),
  ]);
  const finance = permissions.includes("invoices.manage");
  const terms = isPaymentTerms(agent.paymentTerms)
    ? agent.paymentTerms
    : "none";
  const href = agentHref(id);

  const details: [string, ReactNode][] = [
    ["Contact", agent.contactName],
    [
      "Phone",
      <a key="p" href={`tel:${agent.contactPhone}`} className="hover:underline">
        {agent.contactPhone}
      </a>,
    ],
    [
      "Billing Email",
      <a
        key="e"
        href={`mailto:${agent.contactEmail}`}
        className="break-all hover:underline"
      >
        {agent.contactEmail}
      </a>,
    ],
  ];
  if (agent.registrationNo) details.push(["SSM Number", agent.registrationNo]);
  if (agent.address) details.push(["Address", agent.address]);

  return (
    <>
      <PageHeader
        title={agent.name}
        badge={<BusinessStatusBadge status={agent.status} />}
        meta={`Agent · ${PAYMENT_TERMS_LABELS[terms]} · ${agent.daysToPay} days to pay`}
        action={
          <>
            <HistoryLink href={recordHistoryHref(href)} />
            {permissions.includes("agents.manage") ? (
              <AgentStatusControl
                id={id}
                name={agent.name}
                active={agent.status === "active"}
              />
            ) : null}
          </>
        }
      />
      <DetailColumns
        main={
          <>
            <Card flush>
              <CardTitle inset>Invoices</CardTitle>
              <InvoiceTable
                rows={invoices}
                billTo={false}
                empty="No invoice yet."
              />
            </Card>

            <Card flush>
              <CardTitle
                inset
                action={
                  <Link
                    href={bookingsHref(null, { agent: id })}
                    className={CARD_LINK}
                  >
                    All
                  </Link>
                }
              >
                Latest Bookings
              </CardTitle>
              <Table bare>
                <THead>
                  <Th>Booking</Th>
                  <Th align="right">Total</Th>
                </THead>
                <TBody>
                  {bookings.length === 0 ? (
                    <EmptyRow colSpan={2}>No booking yet.</EmptyRow>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.id}>
                        <Td>
                          <TwoLines
                            top={
                              <Link
                                href={bookingHref(null, booking.id)}
                                className="font-semibold underline-offset-4 hover:underline"
                              >
                                {bookingLabelOf(booking)}
                              </Link>
                            }
                            bottom={`${booking.contactName} · ${formatLocalDateTime(booking.startsAt)}`}
                            className="[&>span]:whitespace-normal"
                          />
                        </Td>
                        <Td className="text-right whitespace-nowrap tabular-nums">
                          <span className="block">
                            {formatMyr(booking.priceTotalSen)}
                          </span>
                          <span className="mt-1 inline-block">
                            <BookingStatusBadge status={booking.status} />
                          </span>
                        </Td>
                      </tr>
                    ))
                  )}
                </TBody>
              </Table>
            </Card>
          </>
        }
        side={
          <>
            <Card>
              <CardTitle>Details</CardTitle>
              <Rows rows={details} className="text-sm" />
              {permissions.includes("agents.manage") ? (
                <div className="mt-4 flex">
                  <EditAgentControl id={id} profile={profileOf(agent)} />
                </div>
              ) : null}
            </Card>
            <Card>
              <CardTitle
                action={
                  finance ? (
                    <ChangeTermsControl
                      id={id}
                      terms={terms}
                      daysToPay={agent.daysToPay}
                    />
                  ) : null
                }
              >
                Payment Terms
              </CardTitle>
              <Rows
                rows={[
                  ["Terms", PAYMENT_TERMS_LABELS[terms]],
                  ["Days to Pay", `${agent.daysToPay} days`],
                ]}
                className="text-sm"
              />
              <p className="mt-3 text-caption text-muted">
                {PAYMENT_TERMS_HINTS[terms]}
              </p>
            </Card>
            <HistoryCard
              href={recordHistoryHref(href)}
              entries={entriesSeenBy(entries, permissions)}
            />
          </>
        }
      />
    </>
  );
}
