import Link from "next/link";
import { setupProgress, type SetupStep } from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Card, CardTitle } from "@repo/console/Card";
import { StepMark } from "../../../_components/StepMark";

/**
 * The steps that set a location up, each with where it stands, what is
 * left to do, and a link to its tab for an admin who may open it. The
 * first step not done is marked as the next one. The Overview tab of a
 * draft location; once live, the overview turns to the day's operation.
 * The sidebar marks the same steps on the rows that hold them.
 */
export function SetupChecklist({
  title,
  steps,
  hrefOf,
}: {
  title: string;
  steps: readonly SetupStep[];
  /** The step's tab, or null when the admin may not open it. */
  hrefOf: (step: SetupStep) => string | null;
}) {
  const progress = setupProgress(steps);

  return (
    <Card>
      <CardTitle
        description={
          progress.next
            ? `${progress.done} of ${progress.total} steps done. Each step is a section of the location, marked in the sidebar; the location goes live from its Settings once every step is done.`
            : "Every step is done: the location goes live from its Settings."
        }
      >
        {title}
      </CardTitle>
      <ol className="divide-y divide-slate-100">
        {steps.map((step, index) => {
          const href = hrefOf(step);
          const next = progress.next?.key === step.key;
          return (
            <li
              key={step.key}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 py-3"
            >
              <StepMark number={index + 1} done={step.done} className="mt-px" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {step.title}
                  {next ? <Badge tone="amber">Next</Badge> : null}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{step.status}</p>
                {step.todos.map((todo) => (
                  <p key={todo} className="mt-1 text-sm text-amber-800">
                    {todo}.
                  </p>
                ))}
              </div>
              {href ? (
                <Link
                  href={href}
                  className="text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline"
                >
                  Open
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
