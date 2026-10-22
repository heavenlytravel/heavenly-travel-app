import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";
import { Frame } from "./Card";

/**
 * The console's one table style: small text, a shaded heading row and
 * hairlines between rows, in a frame of its own when it stands alone.
 * `bare` is for a table inside a `flush` card: no frame, a hairline over
 * it, the card's edges for its own. Pages supply the cells.
 */
export function Table({
  bare = false,
  children,
}: {
  bare?: boolean;
  children: ReactNode;
}) {
  const table = <table className="w-full text-left text-sm">{children}</table>;
  return bare ? (
    <div className="min-w-0 overflow-x-auto rounded-b-xl border-t border-slate-200 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
      {table}
    </div>
  ) : (
    <Frame className="overflow-x-auto">{table}</Frame>
  );
}

const HEAD = "border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500";

/** The heading row; put `Th` cells inside. */
export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className={HEAD}>
      <tr>{children}</tr>
    </thead>
  );
}

/**
 * A heading of two rows, for columns grouped under one name: put a `tr`
 * of `ThGroup` cells above a `tr` of `Th` cells.
 */
export function THeadRows({ children }: { children: ReactNode }) {
  return <thead className={HEAD}>{children}</thead>;
}

/** The name over a group of columns, underlined across them; empty for a column outside any group. */
export function ThGroup({
  span = 1,
  children,
}: {
  span?: number;
  children?: ReactNode;
}) {
  return (
    <th colSpan={span} className="px-4 pt-3 pb-0 font-medium">
      {children ? (
        <span className="block border-b border-slate-200 pb-1.5 text-center whitespace-nowrap text-slate-600">
          {children}
        </span>
      ) : null}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function Th({
  children,
  align,
}: {
  children?: ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={cx(
        "px-4 py-3 font-medium whitespace-nowrap",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={cx("px-4 py-3", className)}>{children}</td>;
}

/** The one row a table shows when it has nothing to list. */
export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
        {children}
      </td>
    </tr>
  );
}
