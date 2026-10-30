import Link from "next/link";
import { setupProgress, type SetupStep } from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { Card, CardTitle } from "@repo/console/Card";
import { StepMark } from "@repo/console/StepMark";
import { SetupBar } from "./settings/SetupBar";

/**
 * The steps that set a location up, each with where it stands, what is
 * left to do, and a way to the page that holds it for an admin who may
 * open it, the first step not done marked as the next one. A draft
 * location's dashboard; once live, the dashboard turns to the day. The
 * menu marks the same steps on the rows that hold them.
 */
export function SetupChecklist({
  steps,
  hrefOf,
}: {
  steps: readonly SetupStep[];
  /** The page that holds the step, or null when the admin may not open it. */
  hrefOf: (step: SetupStep) => string | null;
}) {
  const progress = setupProgress(steps);

  return (
    <Card flush>
      <CardTitle
        inset
        meta={`${progress.done} of ${progress.total} done`}
        action={
          <SetupBar
            done={progress.done}
            total={progress.total}
            className="w-28"
          />
        }
      >
        <span className="inline-flex items-center gap-1.5">
          Setup
          <InfoTip text="Each step is a part of the location, marked in the menu. The location goes live from its Settings once every step is done." />
        </span>
      </CardTitle>
      <ol className="divide-y divide-hairline">
        {steps.map((step, index) => {
          const href = hrefOf(step);
          const next = progress.next?.key === step.key;
          return (
            <li
              key={step.key}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 px-5 py-4"
            >
              <StepMark number={index + 1} done={step.done} className="mt-px" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  {step.title}
                  {next ? <Badge tone="amber">Next</Badge> : null}
                </p>
                <p className="mt-0.5 text-caption text-muted">{step.status}</p>
                {step.todos.map((todo) => (
                  <p key={todo} className="mt-1 text-caption text-warning">
                    {todo}.
                  </p>
                ))}
              </div>
              {href ? (
                <Button
                  asChild
                  size="sm"
                  variant={next ? "primary" : "secondary"}
                >
                  <Link href={href}>Open</Link>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>
      {progress.next ? null : (
        <p className="border-t border-hairline px-5 py-3.5 text-caption text-body">
          Every step is done: the location goes live from its Settings.
        </p>
      )}
    </Card>
  );
}
