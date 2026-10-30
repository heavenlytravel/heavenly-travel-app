import type { ReactNode } from "react";
import { PageHeader } from "@repo/console/PageHeader";
import { PublishHistoryButton, type PagePublishEntry } from "./PageHistory";

/**
 * The top of an editor of what the customer site shows, a page or the
 * footer: its name, where it is under it ("Langkawi · Popular places",
 * "Website"), and once it has been published, "Publish history" at the
 * right. The publish bar follows it, in the
 * editor.
 */
export function EditorHeader({
  where,
  title,
  publishes,
  allHref,
  allLabel,
}: {
  /** Where the page is, under its name; a section with a list of its own links to it. */
  where: ReactNode;
  title: string;
  /** Its publishes, newest first. */
  publishes: readonly PagePublishEntry[];
  /** Where every change to such pages is listed. */
  allHref: string;
  allLabel: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        meta={where}
        action={
          publishes.length > 0 ? (
            <PublishHistoryButton
              publishes={publishes}
              allHref={allHref}
              allLabel={allLabel}
            />
          ) : undefined
        }
      />
    </>
  );
}
