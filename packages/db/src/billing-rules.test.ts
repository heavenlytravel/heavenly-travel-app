import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  billingPlanOf,
  billingPlanSentence,
  billToOf,
  dueAtOf,
  invoiceMoneyOf,
  localDayOf,
  periodHasEnded,
  periodLabel,
  periodOf,
  spreadPayment,
  sumMoney,
  suggestedPriceOf,
} from "./billing-rules";

const NOW = new Date("2026-11-08T04:00:00Z");

describe("periods by Malaysia's calendar", () => {
  it("puts 23:30 on the 15th in the first half, 00:30 on the 1st in the new month", () => {
    // 23:30 on 15 November in Malaysia is 15:30 UTC.
    assert.equal(localDayOf(new Date("2026-11-15T15:30:00Z")), "2026-11-15");
    assert.deepEqual(periodOf("2026-11-15", "half-month"), {
      start: "2026-11-01",
      end: "2026-11-15",
    });
    // 00:30 on 1 November in Malaysia is 16:30 UTC on 31 October.
    assert.equal(localDayOf(new Date("2026-10-31T16:30:00Z")), "2026-11-01");
  });

  it("splits a month on the 16th, ends February on its last day", () => {
    assert.deepEqual(periodOf("2026-11-16", "half-month"), {
      start: "2026-11-16",
      end: "2026-11-30",
    });
    assert.deepEqual(periodOf("2028-02-10", "month"), {
      start: "2028-02-01",
      end: "2028-02-29",
    });
  });

  it("issues only a period that has ended", () => {
    const november = periodOf("2026-11-01", "month");
    assert.equal(
      periodHasEnded(november, new Date("2026-11-28T04:00:00Z")),
      false,
    );
    // 1 December 00:10 in Malaysia.
    assert.equal(
      periodHasEnded(november, new Date("2026-11-30T16:10:00Z")),
      true,
    );
  });

  it("names a period", () => {
    assert.equal(
      periodLabel({ start: "2026-11-01", end: "2026-11-30" }),
      "November 2026",
    );
    assert.equal(
      periodLabel({ start: "2026-11-01", end: "2026-11-15" }),
      "1–15 November 2026",
    );
    assert.equal(
      periodLabel({ start: "2026-11-16", end: "2026-11-30" }),
      "16–30 November 2026",
    );
  });
});

describe("what a change bills", () => {
  // Ended (completed or cancelled): what is due is issued at once.
  const base = { confirmed: true, credit: false, ended: true };
  const live = { ...base, ended: false };
  const hti = (id: string, netSen: number) => ({
    invoiceId: id,
    label: id,
    netSen,
  });

  it("bills nothing for a booking not confirmed", () => {
    assert.deepEqual(
      billingPlanOf({ ...base, confirmed: false, chargedSen: 500, billed: [] }),
      { kind: "not-confirmed" },
    );
  });

  it("puts a live booking's difference on its open invoice, either way", () => {
    assert.deepEqual(
      billingPlanOf({ ...live, chargedSen: 35000, billed: [] }),
      {
        kind: "open",
        amountSen: 35000,
      },
    );
    // Paid HTI 7,400, then extras: they wait on the open invoice.
    assert.deepEqual(
      billingPlanOf({
        ...live,
        chargedSen: 795000,
        billed: [hti("a", 740000)],
      }),
      { kind: "open", amountSen: 55000 },
    );
    // Less to pay waits there too, as a credit to give.
    assert.deepEqual(
      billingPlanOf({
        ...live,
        chargedSen: 720000,
        billed: [hti("a", 740000)],
      }),
      { kind: "open", amountSen: -20000 },
    );
    assert.deepEqual(
      billingPlanOf({
        ...live,
        chargedSen: 740000,
        billed: [hti("a", 740000)],
      }),
      { kind: "none" },
    );
  });

  it("bills an ended booking's whole total, the difference after", () => {
    assert.deepEqual(
      billingPlanOf({ ...base, chargedSen: 35000, billed: [] }),
      {
        kind: "invoice",
        amountSen: 35000,
      },
    );
    assert.deepEqual(
      billingPlanOf({ ...base, chargedSen: 55000, billed: [hti("a", 35000)] }),
      { kind: "invoice", amountSen: 20000 },
    );
    assert.deepEqual(
      billingPlanOf({ ...base, chargedSen: 35000, billed: [hti("a", 35000)] }),
      { kind: "none" },
    );
  });

  it("puts more on the agent's month-end invoice, but credits less at once", () => {
    // Live or ended alike: more goes on the month-end invoice.
    const credit = { ...live, credit: true };
    assert.deepEqual(
      billingPlanOf({ ...credit, chargedSen: 40000, billed: [] }),
      {
        kind: "open",
        amountSen: 40000,
      },
    );
    assert.deepEqual(
      billingPlanOf({
        ...credit,
        chargedSen: 49000,
        billed: [hti("run", 40000)],
      }),
      { kind: "open", amountSen: 9000 },
    );
    assert.deepEqual(
      billingPlanOf({
        ...credit,
        chargedSen: 35000,
        billed: [hti("run", 40000)],
      }),
      {
        kind: "credit",
        notes: [{ invoiceId: "run", label: "run", amountSen: -5000 }],
      },
    );
    // A reduction while more waits unbilled only lowers what waits.
    assert.deepEqual(
      billingPlanOf({
        ...credit,
        chargedSen: 44000,
        billed: [hti("run", 40000)],
      }),
      { kind: "open", amountSen: 4000 },
    );
  });

  it("credits newest first, never an invoice below nothing", () => {
    // Rev 1 HTI 350, Rev 2 +200 on its own HTI, then cancelled free.
    assert.deepEqual(
      billingPlanOf({
        ...base,
        chargedSen: 0,
        billed: [hti("second", 20000), hti("first", 35000)],
      }),
      {
        kind: "credit",
        notes: [
          { invoiceId: "second", label: "second", amountSen: -20000 },
          { invoiceId: "first", label: "first", amountSen: -35000 },
        ],
      },
    );
    // A fee of RM50 kept: the newest is credited in full, the first in part.
    const fee = billingPlanOf({
      ...base,
      chargedSen: 5000,
      billed: [hti("second", 20000), hti("first", 35000)],
    });
    assert.deepEqual(fee, {
      kind: "credit",
      notes: [
        { invoiceId: "second", label: "second", amountSen: -20000 },
        { invoiceId: "first", label: "first", amountSen: -30000 },
      ],
    });
    // An invoice credited in full already is passed over.
    assert.deepEqual(
      billingPlanOf({
        ...base,
        chargedSen: 10000,
        billed: [hti("second", 0), hti("first", 35000)],
      }),
      {
        kind: "credit",
        notes: [{ invoiceId: "first", label: "first", amountSen: -25000 }],
      },
    );
  });

  it("says what saving bills", () => {
    const next = {
      invoice: "HTI-0013",
      credit: (i: number) => `HTC-000${4 + i}`,
    };
    assert.equal(
      billingPlanSentence({ kind: "invoice", amountSen: 9000 }, next),
      "Saving issues HTI-0013 for RM 90.00.",
    );
    assert.equal(
      billingPlanSentence(
        {
          kind: "credit",
          notes: [{ invoiceId: "x", label: "HTI-0010", amountSen: -5000 }],
        },
        next,
      ),
      "Saving issues credit note HTC-0004 for RM 50.00 against HTI-0010.",
    );
    assert.equal(
      billingPlanSentence(
        { kind: "open", amountSen: 9000 },
        { ...next, period: "Nov 2026" },
      ),
      "Saving puts RM 90.00 on the agent's Nov 2026 invoice: numbered and issued when the period ends.",
    );
    assert.match(
      billingPlanSentence(
        { kind: "open", amountSen: 9000 },
        { ...next, period: "" },
      ),
      /agent's month-end invoice/,
    );
    assert.equal(
      billingPlanSentence({ kind: "open", amountSen: 55000 }, next),
      "Saving opens the booking's invoice for RM 550.00: payments go on it, and it is numbered and issued when the booking is completed.",
    );
    assert.equal(
      billingPlanSentence(
        { kind: "open", amountSen: 55000 },
        { ...next, opened: true },
      ),
      "Saving moves the booking's open invoice to RM 550.00: the same invoice, numbered and issued when the booking is completed.",
    );
    assert.match(
      billingPlanSentence({ kind: "open", amountSen: -20000 }, next),
      /RM 200.00 to credit/,
    );
  });
});

describe("payment state", () => {
  const money = (
    totalSen: number,
    paidSen: number,
    creditSen = 0,
    dueAt: Date | null = null,
  ) => invoiceMoneyOf({ totalSen, creditSen, paidSen, dueAt, now: NOW });

  it("is unpaid, then overdue past its due date, partly paid, paid", () => {
    assert.equal(money(30000, 0).state, "unpaid");
    const due = new Date("2026-11-01T00:00:00Z");
    assert.equal(money(30000, 0, 0, due).state, "overdue");
    assert.equal(money(30000, 0, 0, due).overdue, true);
    assert.equal(money(30000, 15000, 0, due).state, "partially-paid");
    assert.equal(money(30000, 15000, 0, due).overdue, true);
    assert.equal(money(30000, 30000).state, "paid");
    assert.equal(money(30000, 30000, 0, due).overdue, false);
  });

  it("folds credit notes in: nothing due, or a refund due", () => {
    // Cancelled free before paying: RM300 credited in full.
    assert.equal(money(30000, 0, -30000).state, "nothing-due");
    // Paid RM300, cancelled with a RM50 fee: RM250 credited, then refunded.
    const refundDue = money(30000, 30000, -25000);
    assert.equal(refundDue.state, "refund-due");
    assert.equal(refundDue.balanceSen, -25000);
    assert.equal(money(30000, 30000 - 25000, -25000).state, "paid");
  });

  it("adds a booking's invoices together", () => {
    const parts = [money(35000, 35000), money(20000, 20000), money(9000, 0)];
    const total = sumMoney(parts, NOW)!;
    assert.equal(total.netSen, 64000);
    assert.equal(total.paidSen, 55000);
    assert.equal(total.state, "partially-paid");
    assert.equal(sumMoney([], NOW), null);
  });
});

describe("due dates and who is billed", () => {
  it("gives a business its days to pay, a customer the first pick-up", () => {
    const issued = new Date("2026-12-01T02:00:00Z");
    assert.equal(
      dueAtOf(issued, { daysToPay: 30 }).toISOString(),
      "2026-12-31T02:00:00.000Z",
    );
    const pickup = new Date("2026-12-05T01:00:00Z");
    assert.equal(dueAtOf(issued, { firstPickup: pickup }), pickup);
    // A pick-up passed already: due at issue.
    assert.equal(
      dueAtOf(issued, { firstPickup: new Date("2026-11-20T00:00:00Z") }),
      issued,
    );
  });

  it("reads a stored billed-to safely", () => {
    assert.deepEqual(billToOf({ name: "Asian Trails", businessId: "b1" }), {
      name: "Asian Trails",
      email: "",
      phone: "",
      address: "",
      registrationNo: "",
      businessId: "b1",
    });
    assert.equal(billToOf(null).name, "");
  });
});

describe("the price rule", () => {
  it("moves what the customer pays by what the quote moved", () => {
    // Phone deal: quoted 500, agreed 350; a guide adds 200 to the quote.
    assert.equal(
      suggestedPriceOf({
        chargedSen: 35000,
        oldQuoteSen: 50000,
        newQuoteSen: 70000,
      }),
      55000,
    );
    // No deal: the suggestion is the new quote.
    assert.equal(
      suggestedPriceOf({
        chargedSen: 50000,
        oldQuoteSen: 50000,
        newQuoteSen: 42000,
      }),
      42000,
    );
    assert.equal(
      suggestedPriceOf({
        chargedSen: 1000,
        oldQuoteSen: 50000,
        newQuoteSen: 10000,
      }),
      0,
    );
  });
});

describe("one transfer for a month-end invoice", () => {
  const owed = [
    { bookingId: "a", owedSen: 30000 },
    { bookingId: "b", owedSen: 0 },
    { bookingId: "c", owedSen: 50000 },
  ];

  it("pays the oldest pick-up first, skipping one paid already", () => {
    assert.deepEqual(spreadPayment(60000, owed), [
      { bookingId: "a", amountSen: 30000 },
      { bookingId: "c", amountSen: 30000 },
    ]);
  });

  it("stops where the money runs out", () => {
    assert.deepEqual(spreadPayment(10000, owed), [
      { bookingId: "a", amountSen: 10000 },
    ]);
  });

  it("puts what is paid over on the last booking, to refund", () => {
    assert.deepEqual(spreadPayment(90000, owed), [
      { bookingId: "a", amountSen: 30000 },
      { bookingId: "c", amountSen: 60000 },
    ]);
    assert.deepEqual(spreadPayment(5000, [{ bookingId: "a", owedSen: 0 }]), [
      { bookingId: "a", amountSen: 5000 },
    ]);
  });
});
