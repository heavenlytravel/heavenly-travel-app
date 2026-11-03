"use client";

import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";

/** What the bar says: an error, unsaved changes, a done or plain note, or nothing to save. */
export type SaveStatus = {
  tone: "error" | "dirty" | "done" | "info" | "idle";
  text: string;
};

/**
 * The foot of a price list, the rate grid and Hourly Rates alike: what
 * stands unsaved, Discard, and the save button. Held at the screen's foot
 * on a computer while the list is in view, navy once something changed;
 * on a phone it ends the list, as a form's button does.
 */
export function SaveBar({
  dirty,
  pending,
  status,
  canSave,
  onDiscard,
  onSave,
  label,
}: {
  dirty: boolean;
  pending: boolean;
  status: SaveStatus;
  /** False while a cell is not a price. */
  canSave: boolean;
  onDiscard: () => void;
  onSave: () => void;
  /** The button's words: "Save rates". */
  label: string;
}) {
  return (
    <div
      className={cx(
        "z-(--layer-sticky) flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-card px-5 py-3 md:sticky md:bottom-0",
        dirty
          ? "bg-navy text-white shadow-band"
          : "border-t border-hairline bg-white",
      )}
    >
      <p
        aria-live="polite"
        className={cx(
          "min-w-0 text-sm",
          status.tone === "error"
            ? dirty
              ? "font-semibold text-danger-edge"
              : "text-danger"
            : dirty
              ? "font-semibold"
              : status.tone === "done"
                ? "text-success"
                : status.tone === "idle"
                  ? "text-muted"
                  : "text-body",
        )}
      >
        {status.text}
      </p>
      <div className="ml-auto flex items-center gap-2">
        {dirty ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={onDiscard}
            className="text-white hover:bg-white/10 hover:text-white"
          >
            Discard
          </Button>
        ) : null}
        <Button
          variant={dirty ? "secondary" : "primary"}
          disabled={!dirty || !canSave}
          pending={pending}
          onClick={onSave}
        >
          {pending ? "Saving…" : label}
        </Button>
      </div>
    </div>
  );
}
