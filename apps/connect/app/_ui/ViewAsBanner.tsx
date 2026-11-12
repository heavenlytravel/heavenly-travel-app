import { VIEW_AS_PATH } from "@repo/db";
import { getConnectAccess } from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import { FloatingPill, pillButtonClass } from "@repo/ui/floating-pill";
import { Eye } from "lucide-react";
import Link from "next/link";
import { exitViewAsAction } from "../~/view-as/actions";

/**
 * What floats over every screen while a SUPER views Connect as someone,
 * the pill of the site's staff preview (`FloatingPill`): whom, that it is
 * read only, Switch (the list) and Exit, at the foot of the window, above
 * a phone's tabs. It takes no room, so the screen is laid out as the
 * account sees it, and folds to a round button with an eye. Nothing while
 * not viewing. See docs/261112-connect-view-as.md.
 */
export async function ViewAsBanner() {
  const access = await getConnectAccess();
  if (access.status === "signed-out" || !access.viewAs) return null;
  const { label } = access.viewAs;
  return (
    <FloatingPill
      label="Viewing as"
      foldLabel="Fold the viewing bar"
      unfoldLabel={`Show the viewing bar: viewing as ${label}`}
      storageKey="connect-view-as"
      badge={<span className="size-2.5 rounded-full bg-warning-dot" />}
      className={cx(
        "bottom-[max(env(safe-area-inset-bottom),0.9rem)] text-sm lg:bottom-6",
        // Above a member's tabs, which a phone and a tablet have.
        "max-lg:[:root:has(.ui-dock)_&]:bottom-[calc(max(env(safe-area-inset-bottom),0.9rem)+4.5rem)]",
      )}
    >
      <p className="flex min-w-0 items-center gap-2 pr-1">
        <Eye aria-hidden className="size-4 shrink-0 text-warning-dot" />
        <span className="min-w-0 truncate whitespace-nowrap">
          <span className="max-sm:sr-only">Viewing as </span>
          <strong className="font-semibold">{label}</strong>
          <span className="text-white/70 max-sm:sr-only"> · read only</span>
        </span>
      </p>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/20" />
      <Link href={VIEW_AS_PATH} className={pillButtonClass}>
        Switch
      </Link>
      <form action={exitViewAsAction}>
        <button type="submit" className={pillButtonClass}>
          Exit
        </button>
      </form>
    </FloatingPill>
  );
}
