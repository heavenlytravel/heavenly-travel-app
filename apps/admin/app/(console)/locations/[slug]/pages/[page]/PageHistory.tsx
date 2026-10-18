"use client";

import Link from "next/link";
import {
  formatLocalDateTime,
  type LocationPageKey,
  type PageContent,
} from "@repo/db";
import { Dialog } from "@repo/ui/dialog";
import { PageContentView } from "../../../_components/PageContentView";

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
  page,
  published,
  draft,
  addressNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: LocationPageKey;
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
          <h3 className="mb-3 text-sm font-semibold text-neutral-800">
            Published
          </h3>
          <PageContentView
            page={page}
            content={published}
            comparedTo={draft}
            addressNames={addressNames}
          />
        </section>
        <section className="min-w-0 md:border-l md:border-neutral-200 md:pl-6">
          <h3 className="mb-3 text-sm font-semibold text-neutral-800">
            This draft
          </h3>
          <PageContentView
            page={page}
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
 * it was before and after it, and the way to the location's whole history.
 */
export function HistoryDialog({
  open,
  onOpenChange,
  publishes,
  allHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishes: readonly PagePublishEntry[];
  /** The location's history, narrowed to its pages. */
  allHref: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Publish history"
      description="Every publish of this page, newest first. Open one to read the page before and after it; to roll back, copy the old text into the editor and publish again."
    >
      <div className="grid gap-4">
        <ol className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
          {publishes.map((publish, index) => (
            <li
              key={publish.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block text-neutral-900">
                  {formatLocalDateTime(publish.at)}
                  {index === 0 ? (
                    <span className="ml-2 text-xs text-emerald-700">
                      Latest
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-neutral-500">
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
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          All changes to this location&apos;s pages
        </Link>
      </div>
    </Dialog>
  );
}
