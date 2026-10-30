import { formatDay, type DocumentDue } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import { FileWarning } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState, Panel, Pill, type IconComponent } from "../_ui/parts";

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
  empty: {
    icon: IconComponent;
    title: string;
    text: string;
    action: ReactNode;
  };
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
    <Panel className="connect-rise overflow-hidden lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
      <ul className="divide-y divide-hairline lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0 xl:grid-cols-3">
        {items.map((item) => (
          // On a large screen each is a console tile of its own.
          <li
            key={item.id}
            className="lg:overflow-hidden lg:rounded-card lg:border lg:border-card-edge lg:bg-white lg:shadow-card lg:transition-shadow lg:hover:border-edge lg:hover:shadow-raised"
          >
            <Link
              href={hrefOf(item.id)}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-hover focus-ring-inset active:bg-hairline sm:px-5 lg:h-full lg:items-start lg:rounded-card lg:p-5"
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
                    item.isActive ? "text-ink" : "text-muted",
                  )}
                >
                  {item.title}
                </span>
                <span className="line-clamp-2 text-sm text-muted">
                  {item.detail}
                </span>
                {item.flag ? (
                  <span className="text-xs font-semibold text-warning">
                    {item.flag}
                  </span>
                ) : null}
                {item.isActive ? (
                  <Documents due={item.due} anyEntered={item.anyEntered} />
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {item.isActive ? null : <Pill tone="neutral">Off</Pill>}
                <ChevronRightIcon className="size-5 text-edge" />
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
      <span className="text-xs text-muted">No document dates yet</span>
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
              expired ? "text-danger" : "text-warning",
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
