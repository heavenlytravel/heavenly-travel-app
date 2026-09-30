import { cx } from "@repo/ui/cx";
import type { ReactNode } from "react";

/**
 * The console's one table style: a bordered white card, small text, a
 * muted heading row and hairlines between rows. Pages supply the cells.
 */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

/** The heading row; put `Th` cells inside. */
export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-neutral-200 text-xs text-neutral-500">
      <tr>{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-neutral-100">{children}</tbody>;
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
      className={cx("px-4 py-3 font-medium", align === "right" && "text-right")}
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
      <td colSpan={colSpan} className="px-4 py-8 text-center text-neutral-500">
        {children}
      </td>
    </tr>
  );
}
