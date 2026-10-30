import Link from "next/link";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { TriangleAlertIcon, XIcon } from "@repo/ui/icons";

/**
 * Narrows a list of vehicles or drivers to those with a document due
 * within 30 days or expired, or back to all: one chip beside the search
 * that stays lit while it is on, a cross saying a click takes it off.
 * `label` names the documents: "Documents due" for vehicles, "Licences
 * due" for drivers. `href` is the list with the choice turned over.
 */
export function DueFilter({
  label,
  due,
  href,
}: {
  label: string;
  due: boolean;
  href: string;
}) {
  return (
    <Button
      asChild
      variant="secondary"
      className={cx(
        "shrink-0",
        due
          ? "border-brand bg-brand-tint text-brand hover:bg-white"
          : "text-body shadow-control hover:text-ink",
      )}
    >
      <Link
        href={href}
        aria-current={due ? "page" : undefined}
        aria-label={due ? `${label}, on: show all` : undefined}
      >
        <TriangleAlertIcon className={due ? "text-brand" : "text-muted"} />
        {label}
        {due ? <XIcon className="size-3.5" /> : null}
      </Link>
    </Button>
  );
}
