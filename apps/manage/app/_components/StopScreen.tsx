import type { ReactNode } from "react";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";

/**
 * A screen that stops inside the console's chrome, the sidebar kept: its
 * title, a line on why, and the one way on, a secondary Button. Not found,
 * failed and another team's screen all say it this way.
 */
export function StopScreen({
  title,
  action,
  children,
}: {
  title: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="max-w-xl">
        <p className="text-sm text-body">{children}</p>
        <div className="mt-4">{action}</div>
      </Card>
    </>
  );
}
