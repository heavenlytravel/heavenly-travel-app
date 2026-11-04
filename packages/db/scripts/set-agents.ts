// Usage: pnpm --filter @repo/db db:set-agents [-- --dry-run]
//
// Run once per database after the schema push that brought agents and
// their invoices (docs/261102-booking-ops.md, "5. Quotation and invoice
// numbers"):
//
// - Adds the agents of AGENTS as vendors offering "agent", active, serving
//   every location, with placeholder contacts for Reservation to correct
//   in Manage. One there already, by name, only gains the service and its
//   invoice period. Written here, not through ./vendors, which loads
//   Clerk; logged as the system's all the same.
// - Links each booking staff entered as "AGENT NAME - Customer name" to
//   its agent, and keeps the customer's name alone, logged as the system's
//   change of contact.
// - Sets the invoice counter back to LAST_INVOICE, Finance's last number,
//   unless an invoice holds a later one already.
// - Gives every confirmed or completed booking of an agent its line on the
//   agent's invoice for its period, first pick-up first: the period's
//   invoice from OPENINGS when Finance opened it already, else the next
//   number. Logged as the system's, on each booking's history.
//
// A booking of a customer of ours from before invoice numbers is left for
// staff to give its old number on its page. With --dry-run it prints what
// it would do and writes nothing. Running it again changes nothing.
import { SYSTEM_ACTOR } from "../src/activity-actions";
import {
  formatBookingNumber,
  invoicePeriodStart,
  isInvoicePeriod,
  type InvoicePeriod,
} from "../src/booking-number";
import { invoiceBooking, updateBookingContact } from "../src/bookings";
import { db } from "../src/client";
import { logActivity } from "../src/activity";
import { normalizePhone } from "../src/phone";

/** The agents, as staff wrote them before a name: "ASIAN TRAILS - Gary Coe". */
const AGENTS: { name: string; invoicePeriod: InvoicePeriod }[] = [
  { name: "Asian Trails", invoicePeriod: "month" },
  { name: "World Express", invoicePeriod: "month" },
  { name: "Asia Experience", invoicePeriod: "month" },
  // Credit of 15 days: invoiced for the 1st to the 15th, then the rest.
  { name: "Embassy Alliance", invoicePeriod: "half-month" },
  { name: "Wahdah", invoicePeriod: "month" },
  { name: "Trevabook", invoicePeriod: "month" },
  { name: "Lotus Asia", invoicePeriod: "month" },
];

/** The invoices Finance opened already, by agent and period: November 2026's. */
const OPENINGS: { agent: string; periodStart: string; number: number }[] = [
  { agent: "Asian Trails", periodStart: "2026-11-01", number: 1295 },
  { agent: "Embassy Alliance", periodStart: "2026-11-01", number: 1303 },
  { agent: "Lotus Asia", periodStart: "2026-11-01", number: 1297 },
  { agent: "World Express", periodStart: "2026-11-01", number: 1306 },
  { agent: "Asia Experience", periodStart: "2026-11-01", number: 1259 },
];

/** The last invoice number Finance gave: the next is HTI-1307. */
const LAST_INVOICE = 1306;

const DRY_RUN = process.argv.includes("--dry-run");

const key = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

/** "Asian Trails" as its placeholders: asiantrails@email.com, "AsianTrails Name". */
function placeholders(name: string) {
  const joined = name.replace(/\s+/g, "");
  return {
    contactName: `${joined} Name`,
    contactEmail: `${joined.toLowerCase()}@email.com`,
    contactPhone: normalizePhone("+60123456789"),
  };
}

async function setAgents(): Promise<Map<string, string>> {
  const locations = await db.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const vendors = await db.vendor.findMany();
  const ids = new Map<string, string>();
  for (const agent of AGENTS) {
    const found = vendors.find((v) => key(v.name) === key(agent.name));
    if (found) {
      ids.set(key(agent.name), found.id);
      const services = found.services.includes("agent")
        ? found.services
        : [...found.services, "agent"];
      if (
        services === found.services &&
        found.invoicePeriod === agent.invoicePeriod
      ) {
        continue;
      }
      console.log(
        `${agent.name}: offers "agent", invoiced ${agent.invoicePeriod}.`,
      );
      if (DRY_RUN) continue;
      await db.$transaction(async (tx) => {
        await tx.vendor.update({
          where: { id: found.id },
          data: { services, invoicePeriod: agent.invoicePeriod },
        });
        await logActivity(tx, SYSTEM_ACTOR, {
          action: "vendor.updated",
          entityId: found.id,
          before: {
            services: found.services,
            invoicePeriod: found.invoicePeriod,
          },
          after: { services, invoicePeriod: agent.invoicePeriod },
        });
      });
      continue;
    }
    console.log(`${agent.name}: added, invoiced ${agent.invoicePeriod}.`);
    if (DRY_RUN) {
      ids.set(key(agent.name), `(new ${agent.name})`);
      continue;
    }
    const fields = {
      name: agent.name,
      kind: "company",
      ...placeholders(agent.name),
      services: ["agent"],
      invoicePeriod: agent.invoicePeriod,
    };
    const id = await db.$transaction(async (tx) => {
      const vendor = await tx.vendor.create({
        data: {
          ...fields,
          status: "active",
          locations: { connect: locations.map(({ id }) => ({ id })) },
        },
      });
      await logActivity(tx, SYSTEM_ACTOR, {
        action: "vendor.created",
        entityId: vendor.id,
        after: {
          ...fields,
          locations: locations.map((l) => l.name),
          status: "active",
        },
      });
      return vendor.id;
    });
    ids.set(key(agent.name), id);
  }
  return ids;
}

/** Links "ASIAN TRAILS - Gary Coe" to Asian Trails, keeping "Gary Coe". */
async function linkBookings(agents: Map<string, string>) {
  const bookings = await db.booking.findMany({
    where: { agentId: null, contactName: { contains: " - " } },
    select: {
      id: true,
      reference: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
    },
  });
  for (const booking of bookings) {
    const cut = booking.contactName.indexOf(" - ");
    const agentId = agents.get(key(booking.contactName.slice(0, cut)));
    if (!agentId) continue;
    const name = booking.contactName.slice(cut + 3).trim();
    console.log(
      `${booking.reference}: ${booking.contactName} -> agent, "${name}".`,
    );
    if (DRY_RUN) continue;
    await db.booking.update({ where: { id: booking.id }, data: { agentId } });
    const saved = await updateBookingContact(SYSTEM_ACTOR, booking.id, {
      contactName: name,
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail ?? "",
    });
    if (!saved.ok) throw new Error(`${booking.reference}: ${saved.error}`);
  }
}

async function setCounter() {
  const { _max } = await db.invoice.aggregate({ _max: { number: true } });
  if ((_max.number ?? 0) > LAST_INVOICE) {
    console.log(
      `The counter stays: ${formatBookingNumber("invoice", _max.number!)} is given already.`,
    );
    return;
  }
  console.log(
    `Invoices: last given ${LAST_INVOICE}, next ${formatBookingNumber("invoice", LAST_INVOICE + 1)}.`,
  );
  if (DRY_RUN) return;
  await db.bookingNumberCounter.upsert({
    where: { kind: "invoice" },
    create: { kind: "invoice", last: LAST_INVOICE },
    update: { last: LAST_INVOICE },
  });
}

async function invoiceAgentBookings() {
  const bookings = await db.booking.findMany({
    where: {
      agentId: { not: null },
      invoiceId: null,
      status: { in: ["confirmed", "completed"] },
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      reference: true,
      startsAt: true,
      agent: { select: { name: true, invoicePeriod: true } },
    },
  });
  for (const booking of bookings) {
    const agent = booking.agent!;
    const period = isInvoicePeriod(agent.invoicePeriod)
      ? agent.invoicePeriod
      : "month";
    const periodStart = invoicePeriodStart(booking.startsAt, period);
    const opening = OPENINGS.find(
      (o) => key(o.agent) === key(agent.name) && o.periodStart === periodStart,
    );
    // The opening number is given with the period's first booking only.
    const open = await db.invoice.findFirst({
      where: {
        agent: { name: agent.name },
        periodStart: new Date(`${periodStart}T00:00:00Z`),
      },
      select: { id: true },
    });
    const number = open ? null : (opening?.number ?? null);
    console.log(
      `${booking.reference}: ${agent.name}, period from ${periodStart}${number ? `, opens ${formatBookingNumber("invoice", number)}` : ""}.`,
    );
    if (DRY_RUN) continue;
    const given = await invoiceBooking(SYSTEM_ACTOR, booking.id, number);
    if (!given.ok) throw new Error(`${booking.reference}: ${given.error}`);
  }
}

const agents = await setAgents();
await linkBookings(agents);
await setCounter();
await invoiceAgentBookings();
console.log(DRY_RUN ? "Dry run: nothing written." : "Done.");
await db.$disconnect();
