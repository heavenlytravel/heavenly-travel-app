import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookingLabelOf,
  entriesSeenBy,
  formatLocalDateTime,
  formatMyr,
  isCredit,
  isPaymentTerms,
  PAYMENT_TERMS_HINTS,
  PAYMENT_TERMS_LABELS,
  periodLabel,
  type BusinessProfile,
} from "@repo/db";
import {
  businessRunPeriod,
  getBusiness,
  listActivityFor,
  listBookings,
  listBusinessInvoices,
  listUnbilled,
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
  BillAloneControl,
  ChangeTermsControl,
  CreateRunControl,
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
        <PageHeader title="Add agent" />
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
  const [permissions, unbilled, invoices, bookings, entries] =
    await Promise.all([
      getPermissions(),
      listUnbilled(id),
      listBusinessInvoices(id),
      listBookings({ businessId: id }, { take: 10 }),
      listActivityFor("business", id),
    ]);
  const finance = permissions.includes("invoices.manage");
  const terms = isPaymentTerms(agent.paymentTerms)
    ? agent.paymentTerms
    : "none";
  const period = businessRunPeriod(terms);
  const href = agentHref(id);
  const unbilledSen = unbilled.reduce((sum, b) => sum + b.unbilledSen, 0);

  const details: [string, ReactNode][] = [
    ["Contact", agent.contactName],
    [
      "Phone",
      <a key="p" href={`tel:${agent.contactPhone}`} className="hover:underline">
        {agent.contactPhone}
      </a>,
    ],
    [
      "Billing email",
      <a
        key="e"
        href={`mailto:${agent.contactEmail}`}
        className="break-all hover:underline"
      >
        {agent.contactEmail}
      </a>,
    ],
  ];
  if (agent.registrationNo) details.push(["SSM number", agent.registrationNo]);
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
              <CardTitle
                inset
                meta={unbilled.length > 0 ? formatMyr(unbilledSen) : null}
              >
                Not invoiced yet
              </CardTitle>
              {isCredit(terms) && period && finance ? (
                <div className="grid gap-1.5 border-b border-hairline px-5 py-3.5">
                  <CreateRunControl
                    id={id}
                    period={periodLabel(period)}
                    disabled={unbilled.length === 0}
                  />
                  <p className="text-caption text-muted">
                    Ticks the bookings that first pick up in{" "}
                    {periodLabel(period)}; earlier ones are listed unticked.
                    Nothing is numbered until you issue it.
                  </p>
                </div>
              ) : null}
              <Table bare>
                <THead>
                  <Th>Booking</Th>
                  <Th align="right">Not invoiced</Th>
                  {finance ? <Th /> : null}
                </THead>
                <TBody>
                  {unbilled.length === 0 ? (
                    <EmptyRow colSpan={finance ? 3 : 2}>
                      Every booking of {agent.name} is billed.
                    </EmptyRow>
                  ) : (
                    unbilled.map((booking) => (
                      <tr key={booking.id}>
                        <Td>
                          <TwoLines
                            top={
                              <Link
                                href={bookingHref(null, booking.id)}
                                className="font-semibold underline-offset-4 hover:underline"
                              >
                                {booking.label}
                              </Link>
                            }
                            bottom={[
                              booking.contactName,
                              formatLocalDateTime(booking.startsAt),
                              booking.draftId ? "On a draft" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                            className="[&>span]:whitespace-normal"
                          />
                        </Td>
                        <Td className="text-right whitespace-nowrap tabular-nums">
                          <span className="block font-semibold text-ink">
                            {formatMyr(booking.unbilledSen)}
                          </span>
                          {booking.unbilledSen !== booking.chargedSen ? (
                            <span className="block text-caption text-muted">
                              of {formatMyr(booking.chargedSen)}
                            </span>
                          ) : null}
                        </Td>
                        {finance ? (
                          <Td className="text-right">
                            {booking.draftId ||
                            booking.unbilledSen <= 0 ? null : (
                              <BillAloneControl
                                bookingId={booking.id}
                                label={booking.label}
                                amount={formatMyr(booking.unbilledSen)}
                              />
                            )}
                          </Td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </TBody>
              </Table>
            </Card>

            <Card flush>
              <CardTitle inset>Invoices</CardTitle>
              <InvoiceTable
                rows={invoices}
                billTo={false}
                empty="No invoice yet. Bookings before the switch-over are billed outside the system."
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
                Latest bookings
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
                Payment terms
              </CardTitle>
              <Rows
                rows={[
                  ["Terms", PAYMENT_TERMS_LABELS[terms]],
                  ["Days to pay", `${agent.daysToPay} days`],
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
