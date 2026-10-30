import { cx } from "@repo/ui/cx";
import { CheckIcon, ChevronRightIcon } from "@repo/ui/icons";
import Link from "next/link";
import { Panel } from "../_ui/parts";

/**
 * A new vendor's first steps, ticked off as they go: approved, a vehicle
 * in service, a driver, a driver signed in, a first job. Shown on the home
 * screen until the fleet is ready and work has come.
 */
export function GettingStarted({
  vehicles,
  drivers,
  driversSignedIn,
  jobs,
  owner,
}: {
  vehicles: number;
  drivers: number;
  driversSignedIn: number;
  jobs: number;
  owner: boolean;
}) {
  const steps = [
    { title: "Approved by Heavenly Travel", done: true },
    {
      title: "Add a vehicle",
      text: "Its class is what we offer you jobs for, where it is based.",
      href: "/vehicles/new",
      done: vehicles > 0,
    },
    {
      title: "Add a driver",
      text: "Driving yourself? Add yourself, with your own email.",
      href: "/drivers/new",
      done: drivers > 0,
    },
    {
      title: "A driver signs in",
      text: "With the email you entered for them, to take and report their jobs.",
      href: "/drivers",
      done: driversSignedIn > 0,
    },
    {
      title: "Take your first job",
      text: owner
        ? "Offers show here with what we pay. Add staff in Team to share the work."
        : "Offers show here with what we pay.",
      done: jobs > 0,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <Panel className="connect-rise overflow-hidden">
      <div className="grid gap-3 p-5 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold tracking-title text-ink">
            Get set up
          </h2>
          <span className="text-sm font-semibold text-muted tabular-nums">
            {doneCount} of {steps.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-linear-to-r from-brand to-azure transition-[width]"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="divide-y divide-hairline border-t border-hairline">
        {steps.map((step) => {
          const current = step === next;
          const body = (
            <>
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  step.done
                    ? "bg-success text-white"
                    : current
                      ? "bg-brand text-white ring-4 ring-brand-tint"
                      : "bg-hairline text-muted",
                )}
              >
                {step.done ? (
                  <CheckIcon className="size-4" strokeWidth={3} />
                ) : (
                  steps.indexOf(step) + 1
                )}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span
                  className={cx(
                    "font-semibold",
                    step.done
                      ? "text-muted line-through decoration-edge"
                      : "text-ink",
                  )}
                >
                  {step.title}
                </span>
                {current && step.text ? (
                  <span className="text-sm text-muted">{step.text}</span>
                ) : null}
              </span>
              {step.href && !step.done ? (
                <ChevronRightIcon className="size-5 text-edge" />
              ) : null}
            </>
          );
          return (
            <li key={step.title}>
              {step.href && !step.done ? (
                <Link
                  href={step.href}
                  className={cx(
                    "flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-hover focus-ring-inset",
                    current && "bg-brand-tint/40",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div
                  className={cx(
                    "flex items-center gap-3 px-5 py-3.5",
                    current && "bg-brand-tint/40",
                  )}
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
