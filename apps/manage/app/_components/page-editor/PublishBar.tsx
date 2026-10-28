"use client";

import type { PageStatus } from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Tooltip } from "@repo/ui/tooltip";
import type { ReactNode } from "react";
import { PreviewLink } from "../../(console)/locations/_components/PreviewLink";
import { PageStatusBadge } from "../StatusBadges";

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
        "inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline disabled:opacity-50",
        danger ? "text-red-700" : "text-slate-900",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The bar over an editor of what the customer site shows, a page or the
 * footer, held in view while the form scrolls. Its first line is the
 * name and where it stands, level with "Preview" of the saved draft,
 * "Save draft" and "Publish". Its second line is where it shows on the
 * site, `message` (what its standing means, or what went wrong), then
 * the quiet `moves`, each a `BarLink`.
 */
export function PublishBar({
  title,
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
  title: string;
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
  /** Where it shows on the customer site: "/langkawi", "Every page". */
  path: string;
  message: ReactNode;
  moves: readonly ReactNode[];
}) {
  return (
    // Runs to the column's edges, so the form scrolls out of sight under it.
    <div className="sticky top-14 z-[5] -mx-5 border-b border-slate-200 bg-slate-50/95 px-5 pt-2 pb-4 backdrop-blur-sm md:-mx-10 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <PageStatusBadge status={status} />
          {dirty ? (
            <span className="text-xs font-medium text-amber-700">
              Unsaved edits
            </span>
          ) : null}
        </div>
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
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="text-slate-500">{path}</span>
        <span aria-live="polite">{message}</span>
        {moves.length > 0 ? (
          <span className="flex flex-wrap gap-x-3">{moves}</span>
        ) : null}
      </p>
    </div>
  );
}
