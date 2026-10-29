import Link from "next/link";
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
    <Link
      href={href}
      aria-current={due ? "page" : undefined}
      aria-label={due ? `${label}, on: show all` : undefined}
      className={cx(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-[9px] border px-3.5 text-sm font-semibold transition-colors",
        due
          ? "border-brand bg-brand-tint text-brand hover:bg-white"
          : "border-edge bg-white text-body shadow-control hover:border-slate-300 hover:text-ink",
      )}
    >
      <TriangleAlertIcon className={due ? "text-brand" : "text-muted"} />
      {label}
      {due ? <XIcon className="size-3.5" /> : null}
    </Link>
  );
}
