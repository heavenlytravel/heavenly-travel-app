"use client";

import type { PageCheck } from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Dialog } from "@repo/ui/dialog";
import { Notice } from "@repo/console/Notice";

/**
 * What "Publish" opens: the checks the page must pass, each ticked or
 * with what it still needs and a way to it, what the publish changes from
 * the copy the public has, and where it shows at once a word that it
 * does. "Publish now" waits until every check passes.
 */
export function PublishDialog({
  open,
  onOpenChange,
  pageName,
  goesLive,
  checks,
  limitsError,
  changes,
  pending,
  onPublish,
  onGoTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "the main page" */
  pageName: string;
  /** Where a publish shows at once, the sentence that says so: "Langkawi is public: this goes live at once."; null where it does not. */
  goesLive: string | null;
  checks: readonly PageCheck[];
  /** A length over its limit, which no publish gets past; null for none. */
  limitsError: string | null;
  /** What differs from the published copy, by name; null on the first publish. */
  changes: readonly string[] | null;
  pending: boolean;
  onPublish: () => void;
  /** Shows the part of the page a check is about. */
  onGoTo: (check: PageCheck) => void;
}) {
  const left = checks.filter((check) => check.missing.length > 0).length;
  const ready = left === 0 && limitsError === null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Publish ${pageName}`}
      description={
        ready
          ? "Every check passes. Publishing makes this content what the public sees."
          : `${left === 1 ? "One check is" : `${left} checks are`} not done yet. Finish ${left === 1 ? "it" : "them"} to publish.`
      }
      width="md"
    >
      <div className="grid gap-5">
        {goesLive ? <Notice>{goesLive}</Notice> : null}

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-ink">Before publishing</h3>
          <ol className="divide-y divide-hairline rounded-card border border-card-edge">
            {checks.map((check) => {
              const done = check.missing.length === 0;
              return (
                <li key={check.key} className="flex gap-3 px-3.5 py-3">
                  <span
                    aria-hidden="true"
                    className={cx(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-2xs font-bold",
                      done
                        ? "bg-success text-white"
                        : "border border-warning-edge bg-warning-tint text-warning",
                    )}
                  >
                    {done ? "✓" : "!"}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className={done ? "text-muted" : "text-ink"}>
                      <span className="sr-only">
                        {done ? "Done: " : "Not done: "}
                      </span>
                      {check.label}
                    </p>
                    {done ? null : (
                      <ul className="mt-1 grid gap-0.5 text-xs text-warning">
                        {check.missing.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {done ? null : (
                    <button
                      type="button"
                      onClick={() => onGoTo(check)}
                      className="shrink-0 self-start rounded-sm text-xs font-semibold text-brand underline-offset-4 hover:underline focus-ring"
                    >
                      Go to it
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          {limitsError ? (
            <p className="text-sm text-danger">{limitsError}</p>
          ) : null}
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-semibold text-ink">What changes</h3>
          {changes === null ? (
            <p className="text-sm text-muted">
              Nothing is published yet: this is the page&apos;s first publish.
            </p>
          ) : changes.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing: the draft is the published copy.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {changes.map((part) => (
                <li
                  key={part}
                  className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning"
                >
                  {part}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button disabled={!ready} pending={pending} onClick={onPublish}>
            {pending ? "Publishing…" : "Publish now"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
