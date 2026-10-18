import { Button } from "@repo/ui/button";
import { ExternalLinkIcon } from "@repo/ui/icons";

/**
 * "Preview": opens a page of a location as staff preview it on the
 * customer site, the saved draft whatever the location's state and
 * whether the page is published. A plain link in a new tab, from
 * `locationPreviewUrl`; the customer site checks `locations.manage`.
 */
export function PreviewLink({
  href,
  size = "md",
  title = "Opens the saved draft on the customer site.",
  className,
}: {
  href: string;
  size?: "sm" | "md";
  title?: string;
  className?: string;
}) {
  return (
    <Button asChild variant="secondary" size={size}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={title}
        className={className}
      >
        Preview
        <ExternalLinkIcon />
      </a>
    </Button>
  );
}
