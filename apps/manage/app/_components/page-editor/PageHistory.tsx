"use client";

import Link from "next/link";
import { formatLocalDateTime, type PageContent, type PageKind } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { HistoryIcon } from "@repo/ui/icons";
import { useState, type ReactNode } from "react";
import { CARD_LINK } from "@repo/console/Card";
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
      <SideBySide
        left={
          <PageContentView
            kind={kind}
            content={published}
            comparedTo={draft}
            addressNames={addressNames}
          />
        }
        right={
          <PageContentView
            kind={kind}
            content={draft}
            comparedTo={published}
            addressNames={addressNames}
          />
        }
      />
    </Dialog>
  );
}

/** The published copy and the draft side by side, in a comparing dialog: a page's or the footer's. */
export function SideBySide({
  left,
  right,
}: {
  /** The published copy. */
  left: ReactNode;
  /** The draft. */
  right: ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="min-w-0">
        <h3 className="mb-3 text-sm font-semibold text-ink">Published</h3>
        {left}
      </section>
      <section className="min-w-0 md:border-l md:border-hairline md:pl-6">
        <h3 className="mb-3 text-sm font-semibold text-ink">This draft</h3>
        {right}
      </section>
    </div>
  );
}

/**
 * "Publish history" in an editor's header: the page's publishes, newest
 * first, each opening the page as it was before and after it, and the way
 * to every change of its kind: the location's pages, or the site's.
 */
export function PublishHistoryButton({
  publishes,
  allHref,
  allLabel,
}: {
  publishes: readonly PagePublishEntry[];
  /** Every change of the page's kind: the location's activity, narrowed to its pages. */
  allHref: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <HistoryIcon />
        Publish history
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Publish history"
        description="Every publish of this page, newest first. Open one to read the page before and after it; to roll back, copy the old text into the editor and publish again."
      >
        <div className="grid gap-4">
          <ol className="divide-y divide-hairline rounded-card border border-card-edge text-sm">
            {publishes.map((publish, index) => (
              <li
                key={publish.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-ink">
                    {formatLocalDateTime(publish.at)}
                    {index === 0 ? (
                      <span className="ml-2 text-xs font-semibold text-success">
                        Latest
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {publish.actorName}
                  </span>
                </span>
                <Link href={publish.href} className={`shrink-0 ${CARD_LINK}`}>
                  Before and after
                </Link>
              </li>
            ))}
          </ol>
          <Link href={allHref} className={CARD_LINK}>
            {allLabel} →
          </Link>
        </div>
      </Dialog>
    </>
  );
}
