import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@repo/ui/cx";
import { FormError } from "@repo/ui/form-error";

/** The quiet way out of a form: back where it came from, nothing saved. */
export function CancelLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "rounded-sm text-sm font-medium text-muted underline-offset-4 focus-ring hover:text-ink hover:underline",
        className,
      )}
    >
      Cancel
    </Link>
  );
}

/**
 * The foot of a console form: its submit button, Cancel back to where the
 * form was opened from, and why the last save was refused.
 */
export function FormFoot({
  submit,
  cancelHref,
  error,
}: {
  submit: ReactNode;
  cancelHref: string;
  error: string | null | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {submit}
      <CancelLink href={cancelHref} />
      <FormError error={error} />
    </div>
  );
}
