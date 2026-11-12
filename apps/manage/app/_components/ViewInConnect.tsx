import { connectViewAsPath } from "@repo/db";
import { CONNECT_URL } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { EyeIcon } from "@repo/ui/icons";

/**
 * "View in Connect" on a driver's page, for SUPER: opens
 * Connect in a new tab on the page that starts a read-only view as the
 * account. See docs/261112-connect-view-as.md.
 */
export function ViewInConnect({ userId }: { userId: string }) {
  return (
    <Button asChild variant="secondary">
      <a
        href={CONNECT_URL + connectViewAsPath(userId)}
        target="_blank"
        rel="noreferrer"
      >
        <EyeIcon className="size-4 text-muted" />
        View in Connect
      </a>
    </Button>
  );
}
