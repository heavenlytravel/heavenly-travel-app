import { Button } from "@repo/ui/button";
import { FileTextIcon } from "@repo/ui/icons";

/**
 * A document's PDF, opened in a new tab to read, print or save: a
 * booking's once confirmed, an invoice's once issued (app/_pdf). A plain
 * link, so the browser handles the file.
 */
export function PdfLink({ href }: { href: string }) {
  return (
    <Button asChild variant="secondary">
      <a href={href} target="_blank" rel="noopener">
        <FileTextIcon />
        PDF
      </a>
    </Button>
  );
}
