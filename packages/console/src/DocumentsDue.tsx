import { expiryText, formatDay, type DocumentDue } from "@repo/db";
import { Badge } from "@repo/ui/badge";

/**
 * A vehicle's or a driver's documents as a list reads them: a chip each
 * for the ones due within the warning (amber) or expired (red, a real
 * problem), soonest first, saying how far off it is, its date on hover;
 * "In date" when none is, or "No dates yet" when none was entered.
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
      <span className="text-muted">
        {anyEntered ? "In date" : "No dates yet"}
      </span>
    );
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {due.map((document) => (
        <li key={document.label} title={formatDay(document.expiresOn)}>
          <DocumentChip document={document} />
        </li>
      ))}
    </ul>
  );
}

/** One document due or expired: "Road tax · expires in 5 days". */
export function DocumentChip({ document }: { document: DocumentDue }) {
  return (
    <Badge dot tone={document.state === "expired" ? "red" : "amber"}>
      {document.label} · {expiryText(document.expiresOn).toLowerCase()}
    </Badge>
  );
}
