import { formatDay, type DocumentDue } from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { TriangleAlertIcon } from "@repo/ui/icons";
import { Notice } from "@repo/console/Notice";

const TONES = {
  due: {
    notice: "warning",
    icon: "text-warning",
    link: "border-warning-edge text-warning-strong hover:bg-warning-soft",
  },
  expired: {
    notice: "danger",
    icon: "text-danger",
    link: "border-danger-edge text-danger hover:bg-danger-tint",
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
    <div role="status" className="mb-5">
      <Notice
        tone={tone.notice}
        className="flex flex-wrap items-center gap-x-4 gap-y-3"
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
        <Button
          asChild
          variant="secondary"
          className={cx("shrink-0", tone.link)}
        >
          <a href={`#${card.id}`}>
            {several ? "Update the dates" : "Update the date"}
          </a>
        </Button>
      </Notice>
    </div>
  );
}
