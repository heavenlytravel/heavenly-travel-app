import { formatDay, type DocumentDue } from "@repo/db";
import { cx } from "@repo/ui/cx";
import { TriangleAlertIcon } from "@repo/ui/icons";

const TONES = {
  due: {
    banner: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "text-amber-600",
    link: "border-amber-300 hover:bg-amber-100",
  },
  expired: {
    banner: "border-red-200 bg-red-50 text-red-900",
    icon: "text-red-600",
    link: "border-red-300 hover:bg-red-100",
  },
} as const;

/**
 * Over a vehicle's or a driver's record while a document of theirs needs
 * a look: each one due within 30 days or expired and its day, and the way
 * down to the card its new date goes in. Amber while they are only due,
 * red once one has expired, a real problem. Nothing when none needs a
 * look.
 */
export function DocumentBanner({
  due,
  card,
}: {
  /** The record's documents due or expired, soonest first. */
  due: readonly DocumentDue[];
  /** The card of the dates on the record's page, its id and its name: "Documents". */
  card: { id: string; name: string };
}) {
  if (due.length === 0) return null;
  const tone =
    TONES[
      due.some((document) => document.state === "expired") ? "expired" : "due"
    ];
  const several = due.length > 1;
  return (
    <div
      role="status"
      className={cx(
        "mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border px-5 py-4 text-sm",
        tone.banner,
      )}
    >
      <TriangleAlertIcon className={cx("size-5", tone.icon)} />
      <div className="min-w-0 grow basis-64">
        {due.map((document) => (
          <p key={document.label} className="font-semibold">
            {document.label}{" "}
            {document.state === "expired" ? "expired" : "expires"} on{" "}
            {formatDay(document.expiresOn)}.
          </p>
        ))}
        <p>
          Renew {several ? "them" : "it"}, then put the new{" "}
          {several ? "dates" : "date"} in {card.name}.
        </p>
      </div>
      <a
        href={`#${card.id}`}
        className={cx(
          "inline-flex h-9 shrink-0 items-center rounded-[9px] border bg-white px-3 font-semibold transition-colors",
          tone.link,
        )}
      >
        {several ? "Update the dates" : "Update the date"}
      </a>
    </div>
  );
}
