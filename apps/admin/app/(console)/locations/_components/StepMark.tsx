import { cx } from "@repo/ui/cx";

/**
 * Where one step of a location's setup stands, as a small circle: a tick
 * on green once it is done, its number on a ring until then. On the tabs
 * and in the checklist of a draft location.
 */
export function StepMark({
  number,
  done,
  className,
}: {
  number: number;
  done: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={done ? `Step ${number}, done` : `Step ${number}, to do`}
      className={cx(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
        done
          ? "bg-emerald-600 text-white"
          : "border border-slate-400 text-slate-600",
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
