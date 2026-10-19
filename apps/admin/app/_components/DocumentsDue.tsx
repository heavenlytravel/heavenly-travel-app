import { formatDay, type DocumentDue } from "@repo/db";
import { Badge } from "@repo/ui/badge";

/**
 * A vehicle's or a driver's documents as a list reads them: each one due
 * within the warning or expired, soonest first, with its date; "In date"
 * when none is, or "No dates yet" when none was entered.
 */
export function DocumentsDue({
  due,
  anyEntered,
}: {
  due: readonly DocumentDue[];
  /** Whether any expiry date is entered at all. */
  anyEntered: boolean;
}) {
  if (due.length === 0) {
    return (
      <span className="text-neutral-500">
        {anyEntered ? "In date" : "No dates yet"}
      </span>
    );
  }
  return (
    <ul className="grid gap-1">
      {due.map((document) => (
        <li
          key={document.label}
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
        >
          <Badge tone={document.state === "expired" ? "red" : "amber"}>
            {document.state === "expired" ? "Expired" : "Due"}
          </Badge>
          <span className="text-neutral-700">{document.label}</span>
          <span className="text-xs text-neutral-500 tabular-nums">
            {formatDay(document.expiresOn)}
          </span>
        </li>
      ))}
    </ul>
  );
}
