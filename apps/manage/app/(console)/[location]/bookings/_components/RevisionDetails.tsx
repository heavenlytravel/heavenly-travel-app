import type { RevisionDetail } from "@repo/db";

/**
 * What a revision changed, a line each: "Trip 1 · Pick-up time: Wed, 11
 * Nov 2026, 13:00 → Thu, 12 Nov 2026, 09:00"; a charge added or taken
 * off. The booking's Revisions and an invoice's Changes show it.
 */
export function RevisionDetails({
  details,
}: {
  details: readonly RevisionDetail[];
}) {
  if (details.length === 0) return null;
  return (
    <ul className="mt-1.5 grid gap-1 text-caption">
      {details.map((detail, index) => (
        <li key={index} className="text-body">
          <span className="text-muted">{detail.label}: </span>
          {detail.before !== null ? (
            <span className="text-muted line-through">{detail.before}</span>
          ) : null}
          {detail.before !== null && detail.after !== null ? (
            <span className="text-muted"> → </span>
          ) : null}
          {detail.after !== null ? <span>{detail.after}</span> : null}
        </li>
      ))}
    </ul>
  );
}
