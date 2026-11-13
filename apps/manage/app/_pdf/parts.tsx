import "server-only";
import type { CompanyDetails } from "@repo/db/server";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactElement, ReactNode } from "react";

/**
 * The pieces every document Manage downloads shares (a booking's, an
 * invoice's, a credit note's): the page and its letterhead from the
 * company's details, a title with the document's number, labelled rows,
 * a table of lines with a total, a stamp, and the foot. The one PDF
 * module: each document lays these out (./booking-pdf, ./invoice-pdf).
 * Manage only for now: customers do not download them. See
 * docs/261111-catalogue-booking-flow-and-ops.md, part F.
 */

/**
 * The design tokens a PDF uses, as values: a PDF cannot read the
 * stylesheet. They mirror --brand, --ink, --body, --muted and --hairline
 * in packages/tailwind-config/shared-styles.css; change both together.
 */
const TOKENS = {
  brand: "#046bd2",
  ink: "#00264b",
  body: "#1e293b",
  muted: "#5b6b80",
  hairline: "#eef2f7",
  danger: "#b91c1c",
  success: "#15803d",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: TOKENS.body,
    lineHeight: 1.4,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: TOKENS.brand,
    paddingBottom: 14,
    marginBottom: 18,
  },
  brand: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: TOKENS.brand,
    lineHeight: 1.2,
    marginBottom: 4,
  },
  small: { fontSize: 8.5, color: TOKENS.muted },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: TOKENS.ink,
    textAlign: "right",
    lineHeight: 1.2,
    marginBottom: 4,
  },
  number: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: TOKENS.ink,
    textAlign: "right",
  },
  section: { marginBottom: 14 },
  heading: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: TOKENS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 110, color: TOKENS.muted },
  value: { flex: 1, color: TOKENS.body },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.ink,
    paddingBottom: 4,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    color: TOKENS.ink,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.hairline,
    paddingVertical: 5,
  },
  total: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 6,
    fontFamily: "Helvetica-Bold",
    color: TOKENS.ink,
  },
  stamp: {
    position: "absolute",
    top: 150,
    right: 44,
    borderWidth: 2,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    transform: "rotate(-8deg)",
  },
  foot: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: TOKENS.muted,
  },
});

/** A document's page: the letterhead, its title and number, its body, and the foot with the page count. */
export function PdfPage({
  company,
  title,
  number,
  under,
  stamp,
  children,
}: {
  company: CompanyDetails;
  /** "Booking Confirmation", "Invoice". */
  title: string;
  /** "HTB-1042". */
  number: string;
  /** Lines under the number: "Quotation HTQ-0012", "Issued 3 Nov 2026". */
  under?: readonly string[];
  /** "PAID", "VOID": over the page's head, in its colour. */
  stamp?: { text: string; tone: "success" | "danger" } | null;
  children: ReactNode;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.head} fixed>
        <View>
          <Text style={styles.brand}>Heavenly Travel</Text>
          <Text style={styles.small}>
            {[
              company.legalName,
              company.registration && `SSM ${company.registration}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {company.address.map((line) => (
            <Text key={line} style={styles.small}>
              {line}
            </Text>
          ))}
          <Text style={styles.small}>
            {[company.phone, company.email].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.number}>{number}</Text>
          {under?.map((line) => (
            <Text key={line} style={[styles.small, { textAlign: "right" }]}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      {stamp ? (
        <Text
          style={[
            styles.stamp,
            { color: TOKENS[stamp.tone], borderColor: TOKENS[stamp.tone] },
          ]}
          fixed
        >
          {stamp.text}
        </Text>
      ) : null}
      {children}
      <View style={styles.foot} fixed>
        <Text>
          {company.legalName || "Heavenly Travel"} · {number}
        </Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

/**
 * A titled block of the document, kept on one page, or, with `breaks`
 * (a table of lines), running on to the next with its heading kept with
 * its first rows.
 */
export function PdfSection({
  heading,
  breaks = false,
  children,
}: {
  heading: string;
  breaks?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.section} wrap={breaks}>
      <Text style={styles.heading} minPresenceAhead={40}>
        {heading}
      </Text>
      {children}
    </View>
  );
}

/** Labelled rows: "Pick-up · KLIA". A row with no value is left out. */
export function PdfRows({
  rows,
}: {
  rows: readonly (readonly [string, string | null | undefined])[];
}) {
  return (
    <View>
      {rows
        .filter(([, value]) => value)
        .map(([label, value], index) => (
          <View key={`${label}:${index}`} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
    </View>
  );
}

/** A column of a table: its heading, its share of the width, and how its cells align. */
export type PdfColumn = { heading: string; flex: number; right?: boolean };

/** A table of lines, the last column amounts, with its total rows under it. */
export function PdfTable({
  columns,
  rows,
  totals,
}: {
  columns: readonly PdfColumn[];
  rows: readonly (readonly string[])[];
  /** "Total", "RM 950.00"; "Paid", … */
  totals: readonly (readonly [string, string])[];
}) {
  const cell = (column: PdfColumn) => ({
    flex: column.flex,
    textAlign: column.right ? ("right" as const) : ("left" as const),
    paddingRight: column.right ? 0 : 6,
  });
  return (
    <View>
      <View style={styles.tableHead} fixed>
        {columns.map((column) => (
          <Text key={column.heading} style={cell(column)}>
            {column.heading}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.tableRow} wrap={false}>
          {columns.map((column, at) => (
            <Text key={column.heading} style={cell(column)}>
              {row[at] ?? ""}
            </Text>
          ))}
        </View>
      ))}
      {totals.map(([label, amount]) => (
        <View key={label} style={styles.total}>
          <Text style={{ width: 120, textAlign: "right", paddingRight: 12 }}>
            {label}
          </Text>
          <Text style={{ width: 90, textAlign: "right" }}>{amount}</Text>
        </View>
      ))}
    </View>
  );
}

/** A note in small grey type: terms, where to pay. */
export function PdfNote({ children }: { children: ReactNode }) {
  return <Text style={[styles.small, { marginTop: 10 }]}>{children}</Text>;
}

/**
 * A document rendered, as the download answers it: inline in the browser
 * under its number's file name, never cached, as it changes with the
 * booking.
 */
export async function pdfResponse(
  page: ReactElement,
  meta: { title: string; fileName: string },
): Promise<Response> {
  const buffer = await renderToBuffer(
    <Document title={meta.title} author="Heavenly Travel">
      {page}
    </Document>,
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${meta.fileName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
