import { Button } from "@repo/ui/button";
import { ExternalLinkIcon } from "@repo/ui/icons";
import { Tooltip } from "@repo/ui/tooltip";

/**
 * "Preview": opens a page of a location as staff preview it on the
 * customer site, the saved draft whatever the location's state and
 * whether the page is published. A plain link in a new tab, from
 * `locationPreviewUrl`; the customer site checks `locations.manage`.
 */
export function PreviewLink({
  href,
  size = "md",
  hint = "Opens the saved draft on the customer site.",
  className,
}: {
  href: string;
  size?: "sm" | "md";
  /** The tooltip. */
  hint?: string;
  className?: string;
}) {
  return (
    <Tooltip content={hint}>
      <Button asChild variant="secondary" size={size}>
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          Preview
          <ExternalLinkIcon />
        </a>
      </Button>
    </Tooltip>
  );
}
