import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";
import { Frame } from "./Card";

/**
 * The console's one table style: column names small and upper case on a
 * shaded row, rows of a comfortable height split by hairlines and lit
 * under the pointer, in a frame of its own when it stands alone. `bare`
 * is for a table inside a `flush` card: no frame, the card's edges for its
 * own. Pages supply the cells. The scroller is positioned so an `sr-only`
 * heading scrolls with the table instead of widening the page.
 */
export function Table({
  bare = false,
  children,
}: {
  bare?: boolean;
  children: ReactNode;
}) {
  const table = (
    <table className="w-full text-left text-sm [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">
      {children}
    </table>
  );
  return bare ? (
    <div className="relative min-w-0 overflow-x-auto rounded-b-card">
      {table}
    </div>
  ) : (
    <Frame className="relative overflow-x-auto">{table}</Frame>
  );
}

const HEAD =
  "border-b border-hairline bg-shade text-[11px] tracking-[0.05em] text-muted uppercase";

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
    <th colSpan={span} className="px-3.5 pt-3 pb-0 font-semibold">
      {children ? (
        <span className="block border-b border-edge pb-1.5 text-center whitespace-nowrap text-slate-600">
          {children}
        </span>
      ) : null}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-hairline [&>tr]:transition-colors [&>tr:hover]:bg-hover">
      {children}
    </tbody>
  );
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
        "px-3.5 py-2.5 font-semibold whitespace-nowrap",
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
  return (
    <td className={cx("h-[3.25rem] px-3.5 py-2.5", className)}>{children}</td>
  );
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
      <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
        {children}
      </td>
    </tr>
  );
}

/** A cell of two lines: the thing in full, then a grey line about it. */
export function TwoLines({
  top,
  bottom,
  className,
}: {
  top: ReactNode;
  bottom?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("grid min-w-0", className)}>
      <span className="truncate font-medium text-body">{top}</span>
      {bottom ? (
        <span className="truncate text-[12.5px] text-muted">{bottom}</span>
      ) : null}
    </span>
  );
}
