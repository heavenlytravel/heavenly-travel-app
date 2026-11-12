import Link from "next/link";
import {
  describeActivity,
  formatLocalDateTime,
  type PageContent,
  type PageKind,
} from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import type { ReactNode } from "react";
import { PageContentView } from "./PageContentView";

/**
 * One publish of what the customer site shows, a site page, the footer or
 * a blog post: as it was before and as it was published, side by side,
 * the parts that differ marked. There is no restore button: to roll back,
 * Marketing copies the old text into the editor and publishes again.
 */

/** A page names no saved address. */
const NO_ADDRESSES: ReadonlyMap<string, string> = new Map();

/** A publish's sentence as its title, who and when, the way to its editor, then `children` side by side. */
export function PublishHeader({
  entry,
  edit,
  children,
}: {
  entry: ActivityEntry;
  edit: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={describeActivity(entry)}
        badge={
          <InfoTip text="To roll back, copy the old text into the editor and publish again." />
        }
        meta={`${entry.actorName}, ${formatLocalDateTime(entry.createdAt)}`}
        action={
          <Button asChild variant="secondary">
            <Link href={edit.href}>{edit.label}</Link>
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">{children}</div>
    </>
  );
}

/** A page's content before and as published, each card marking what differs from the other. */
export function PagePublishCards({
  kind,
  before,
  after,
}: {
  kind: PageKind;
  /** Null on the first publish. */
  before: PageContent | null;
  after: PageContent;
}) {
  return (
    <>
      <Card>
        <CardTitle>Before</CardTitle>
        {before ? (
          <PageContentView
            kind={kind}
            content={before}
            comparedTo={after}
            addressNames={NO_ADDRESSES}
          />
        ) : (
          <p className="text-sm text-muted">
            Nothing: this was the first publish.
          </p>
        )}
      </Card>
      <Card>
        <CardTitle>Published</CardTitle>
        <PageContentView
          kind={kind}
          content={after}
          comparedTo={before ?? undefined}
          addressNames={NO_ADDRESSES}
        />
      </Card>
    </>
  );
}
