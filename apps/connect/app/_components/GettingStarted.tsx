import { cx } from "@repo/ui/cx";
import { Check, ChevronRight } from "lucide-react";
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
          <h2 className="text-lg font-bold text-ink">Get set up</h2>
          <span className="text-sm font-semibold text-slate-500 tabular-nums">
            {doneCount} of {steps.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-azure transition-[width]"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="divide-y divide-slate-100 border-t border-slate-100">
        {steps.map((step) => {
          const current = step === next;
          const body = (
            <>
              <span
                className={cx(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  step.done
                    ? "bg-emerald-500 text-white"
                    : current
                      ? "bg-brand text-white ring-4 ring-brand-tint"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {step.done ? (
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                ) : (
                  steps.indexOf(step) + 1
                )}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span
                  className={cx(
                    "font-semibold",
                    step.done
                      ? "text-slate-400 line-through decoration-slate-300"
                      : "text-slate-900",
                  )}
                >
                  {step.title}
                </span>
                {current && step.text ? (
                  <span className="text-sm text-slate-500">{step.text}</span>
                ) : null}
              </span>
              {step.href && !step.done ? (
                <ChevronRight aria-hidden className="size-5 text-slate-300" />
              ) : null}
            </>
          );
          return (
            <li key={step.title}>
              {step.href && !step.done ? (
                <Link
                  href={step.href}
                  className={cx(
                    "flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50",
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
