import Link from "next/link";
import type { DocumentDue } from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Card } from "@repo/console/Card";
import { DocumentsDue } from "@repo/console/DocumentsDue";

/** One vehicle or driver on a vendor's list. */
export type FleetRow = {
  id: string;
  title: string;
  detail: string;
  isActive: boolean;
  due: DocumentDue[];
  anyEntered: boolean;
};

/**
 * A vendor's vehicles or drivers as a list for a phone: each opens its
 * form, with where it is based, whether it is in service, and its
 * documents due.
 */
export function FleetRows({
  rows,
  hrefOf,
  emptyMessage,
}: {
  rows: FleetRow[];
  hrefOf: (id: string) => string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-slate-600">{emptyMessage}</p>
      </Card>
    );
  }
  return (
    <Card className="grid gap-1" flush>
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={hrefOf(row.id)}
              className={`grid gap-1 px-6 py-3 hover:bg-slate-50 ${row.isActive ? "" : "text-slate-500"}`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{row.title}</span>
                <Badge tone={row.isActive ? "green" : "neutral"}>
                  {row.isActive ? "In service" : "Out of service"}
                </Badge>
              </span>
              <span className="text-sm text-slate-600">{row.detail}</span>
              {row.isActive ? (
                <DocumentsDue due={row.due} anyEntered={row.anyEntered} />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
