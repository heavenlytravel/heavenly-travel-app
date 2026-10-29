import { BackLink, PageHeader } from "@repo/console/PageHeader";
import { PublishHistoryButton, type PagePublishEntry } from "./PageHistory";

/**
 * The top of an editor of what the customer site shows, a page or the
 * footer: the way back to its list on Pages, its name under where it is
 * ("Langkawi · Popular places", "Website"), and once it has been published,
 * "Publish history" at the right. The publish bar follows it, in the
 * editor.
 */
export function EditorHeader({
  back,
  section,
  title,
  publishes,
  allHref,
  allLabel,
}: {
  /** Its list on Pages: the section's, or every page. */
  back: { href: string; label: string };
  /** Where the page is, small over its name. */
  section: string;
  title: string;
  /** Its publishes, newest first. */
  publishes: readonly PagePublishEntry[];
  /** Where every change to such pages is listed. */
  allHref: string;
  allLabel: string;
}) {
  return (
    <>
      <BackLink href={back.href}>{back.label}</BackLink>
      <PageHeader
        section={section}
        title={title}
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
