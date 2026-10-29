"use client";

import type { PageStatus } from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Tooltip } from "@repo/ui/tooltip";
import type { ReactNode } from "react";
import { SURFACE } from "@repo/console/Card";
import { PageStatusBadge } from "@repo/console/StatusBadges";
import { PreviewLink } from "../../(console)/[location]/pages/_components/PreviewLink";

/** A quiet button in the publish bar's second line. */
export function BarLink({
  onClick,
  danger = false,
  disabled,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1 rounded-sm font-semibold underline-offset-4 hover:underline focus-ring disabled:opacity-50",
        danger ? "text-danger" : "text-brand",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The bar under an editor's title, of a page or the footer the customer
 * site shows, held in view while the form scrolls: where it stands, "Unsaved
 * edits" while the form holds some, and `message` (what its standing means,
 * or what went wrong), level with "Preview" of the saved draft, "Save
 * draft" and "Publish". Its second line is where it shows on the site,
 * then the quiet `moves`, each a `BarLink`. On a phone the buttons follow
 * the words.
 */
export function PublishBar({
  status,
  dirty,
  previewUrl,
  canSave,
  onSave,
  canPublish,
  publishHint,
  onPublish,
  path,
  message,
  moves,
}: {
  status: PageStatus;
  /** Whether the form holds edits not saved yet. */
  dirty: boolean;
  /** The saved draft on the customer site. */
  previewUrl: string;
  canSave: boolean;
  onSave: () => void;
  canPublish: boolean;
  /** The tooltip on "Publish": why it is off; null for none. */
  publishHint: string | null;
  onPublish: () => void;
  /** Where it shows on the customer site: "/langkawi", "On every page". */
  path: string;
  message: ReactNode;
  moves: readonly ReactNode[];
}) {
  return (
    // On the canvas from the column's edges, so the form scrolls out of
    // sight under it rather than showing round the card. Under the top bar,
    // over the form.
    <div className="sticky top-(--header-height) z-(--layer-raised) -mx-4 -mt-3 bg-canvas/95 px-4 pt-2 pb-3 backdrop-blur-sm md:-mx-7 md:px-7">
      <div className={cx("px-4 py-3 md:px-5", SURFACE)}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
          <p
            aria-live="polite"
            className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption"
          >
            <PageStatusBadge status={status} />
            {dirty ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-warning">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-current"
                />
                Unsaved edits
              </span>
            ) : null}
            <span className="min-w-0">{message}</span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <PreviewLink
              size="sm"
              href={previewUrl}
              hint={
                dirty
                  ? "Shows the saved draft: save first to see your latest edits."
                  : undefined
              }
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={!canSave}
              onClick={onSave}
            >
              Save draft
            </Button>
            <Tooltip content={publishHint}>
              <Button size="sm" disabled={!canPublish} onClick={onPublish}>
                Publish
              </Button>
            </Tooltip>
          </div>
        </div>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-hairline pt-2 text-caption">
          <span className="[overflow-wrap:anywhere] text-muted">{path}</span>
          {moves.length > 0 ? (
            <span className="flex flex-wrap gap-x-3">{moves}</span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
