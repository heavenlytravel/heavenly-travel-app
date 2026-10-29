import { cx } from "@repo/ui/cx";

/**
 * Where one step stands, as a small circle: a tick on green once it is
 * done, its number on a ring until then, or the ring alone where the steps
 * are not counted. On a draft location's checklist and the sidebar rows of
 * its setup, and on the steps of a booking form.
 */
export function StepMark({
  number,
  done,
  className,
}: {
  /** None where the steps are not counted, as in the sidebar. */
  number?: number;
  done: boolean;
  className?: string;
}) {
  const name = number === undefined ? "Setup step" : `Step ${number}`;
  return (
    <span
      role="img"
      aria-label={done ? `${name}, done` : `${name}, to do`}
      className={cx(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold tabular-nums",
        done ? "bg-brand text-white" : "border-2 border-edge text-muted",
        className,
      )}
    >
      {done ? (
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.5 5 9l4.5-5.5" />
        </svg>
      ) : (
        number
      )}
    </span>
  );
}
