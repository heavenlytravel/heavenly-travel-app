import { formatDay, type DocumentDue } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { ChevronRight, FileWarning, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState, Panel, Pill } from "../_ui/parts";

/** One vehicle or driver on a vendor's list. */
export type FleetItem = {
  id: string;
  /** The plate, or the driver's initials. */
  lead: ReactNode;
  title: string;
  detail: string;
  /** A short line under, in amber: "No email, so cannot sign in". */
  flag?: string;
  isActive: boolean;
  due: DocumentDue[];
  anyEntered: boolean;
};

/**
 * A vendor's vehicles or drivers as a list for a phone: each opens its
 * form, with where it is based, whether it is in service, and its
 * documents due, in amber or red, the one thing worth a look.
 */
export function FleetList({
  items,
  hrefOf,
  empty,
}: {
  items: FleetItem[];
  hrefOf: (id: string) => string;
  empty: { icon: LucideIcon; title: string; text: string; action: ReactNode };
}) {
  if (items.length === 0) {
    return (
      <EmptyState icon={empty.icon} title={empty.title} action={empty.action}>
        {empty.text}
      </EmptyState>
    );
  }
  return (
    // One panel of rows on a phone; a grid of cards on a large screen.
    <Panel className="connect-rise overflow-hidden lg:overflow-visible lg:rounded-none lg:bg-transparent lg:shadow-none lg:ring-0">
      <ul className="divide-y divide-slate-100 lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0 xl:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="lg:overflow-hidden lg:rounded-3xl lg:bg-white lg:shadow-[0_1px_2px_rgba(0,38,75,0.06),0_12px_32px_-16px_rgba(0,38,75,0.18)] lg:ring-1 lg:ring-slate-900/5 lg:transition-shadow lg:hover:shadow-[0_1px_2px_rgba(0,38,75,0.06),0_18px_40px_-16px_rgba(0,38,75,0.3)]"
          >
            <Link
              href={hrefOf(item.id)}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:px-5 lg:h-full lg:items-start lg:p-5"
            >
              <span
                className={cx(
                  "grid shrink-0 place-items-center",
                  !item.isActive && "opacity-50 grayscale",
                )}
              >
                {item.lead}
              </span>
              <span className="grid min-w-0 flex-1 gap-1">
                <span
                  className={cx(
                    "truncate font-semibold",
                    item.isActive ? "text-slate-900" : "text-slate-500",
                  )}
                >
                  {item.title}
                </span>
                <span className="line-clamp-2 text-sm text-slate-500">
                  {item.detail}
                </span>
                {item.flag ? (
                  <span className="text-xs font-semibold text-amber-700">
                    {item.flag}
                  </span>
                ) : null}
                {item.isActive ? (
                  <Documents due={item.due} anyEntered={item.anyEntered} />
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {item.isActive ? null : <Pill tone="slate">Off</Pill>}
                <ChevronRight aria-hidden className="size-5 text-slate-300" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** The documents due or expired, soonest first; nothing when all are in date. */
function Documents({
  due,
  anyEntered,
}: {
  due: readonly DocumentDue[];
  anyEntered: boolean;
}) {
  if (due.length === 0) {
    return anyEntered ? null : (
      <span className="text-xs text-slate-400">No document dates yet</span>
    );
  }
  return (
    <ul className="mt-0.5 grid gap-1">
      {due.map((document) => {
        const expired = document.state === "expired";
        return (
          <li
            key={document.label}
            className={cx(
              "flex items-center gap-1.5 text-xs font-semibold",
              expired ? "text-red-700" : "text-amber-700",
            )}
          >
            <FileWarning aria-hidden className="size-3.5 shrink-0" />
            {document.label} {expired ? "expired" : "due"}{" "}
            {formatDay(document.expiresOn)}
          </li>
        );
      })}
    </ul>
  );
}
