"use client";

import Link from "next/link";
import { formatLocalDateTime, type PageContent, type PageKind } from "@repo/db";
import { Dialog } from "@repo/ui/dialog";
import { PageContentView } from "./PageContentView";

/** One publish of the page, as its history lists it. */
export type PagePublishEntry = {
  id: string;
  at: Date;
  actorName: string;
  /** The page as it was before and after that publish. */
  href: string;
};

/**
 * "Compare": the copy the public sees beside the draft in the editor,
 * unsaved edits included, each part that differs marked on both sides,
 * so what a publish would change can be read before it is made.
 */
export function CompareDialog({
  open,
  onOpenChange,
  kind,
  published,
  draft,
  addressNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PageKind;
  published: PageContent;
  draft: PageContent;
  addressNames: ReadonlyMap<string, string>;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="The published copy and this draft"
      description="What the public sees now beside what you are editing. The parts that differ are marked Changed."
      width="lg"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <section className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Published
          </h3>
          <PageContentView
            kind={kind}
            content={published}
            comparedTo={draft}
            addressNames={addressNames}
          />
        </section>
        <section className="min-w-0 md:border-l md:border-slate-200 md:pl-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            This draft
          </h3>
          <PageContentView
            kind={kind}
            content={draft}
            comparedTo={published}
            addressNames={addressNames}
          />
        </section>
      </div>
    </Dialog>
  );
}

/**
 * "History": the page's publishes, newest first, each opening the page as
 * it was before and after it, and the way to every change of its kind:
 * the location's pages, or the site's.
 */
export function HistoryDialog({
  open,
  onOpenChange,
  publishes,
  allHref,
  allLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishes: readonly PagePublishEntry[];
  /** Every change of the page's kind: the location's history, narrowed to its pages. */
  allHref: string;
  allLabel: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publish history"
      description="Every publish of this page, newest first. Open one to read the page before and after it; to roll back, copy the old text into the editor and publish again."
    >
      <div className="grid gap-4">
        <ol className="divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
          {publishes.map((publish, index) => (
            <li
              key={publish.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block text-slate-900">
                  {formatLocalDateTime(publish.at)}
                  {index === 0 ? (
                    <span className="ml-2 text-xs text-emerald-700">
                      Latest
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {publish.actorName}
                </span>
              </span>
              <Link
                href={publish.href}
                className="shrink-0 text-xs font-medium underline-offset-4 hover:underline"
              >
                Before and after
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href={allHref}
          className="text-sm text-slate-600 underline-offset-4 hover:underline"
        >
          {allLabel}
        </Link>
      </div>
    </Dialog>
  );
}
