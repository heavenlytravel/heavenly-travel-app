import type { PageSectionOf } from "@repo/db";
import { SectionShell, type SectionLook } from "./SectionShell";

/**
 * How booking works, step by step: each its number on a dashed road that
 * runs from one to the next, side by side from lg, one under the other
 * on a phone with the road running down beside them.
 */
export function BookingSteps({
  look,
  section,
}: {
  look: SectionLook;
  section: PageSectionOf<"steps">;
}) {
  const count = section.steps.length;
  return (
    <SectionShell look={look} id="steps" section={section}>
      <ol
        className={`mx-auto grid max-w-[1240px] text-left lg:gap-6 ${
          count === 4
            ? "lg:grid-cols-4"
            : count === 3
              ? "lg:grid-cols-3"
              : "lg:grid-cols-2"
        }`}
      >
        {section.steps.map((step, i) => (
          <li
            key={i}
            className="relative grid grid-cols-[auto_1fr] gap-x-4 pb-8 last:pb-0 lg:block lg:pb-0"
          >
            {/* The road to the next step: down on a phone, across from lg. */}
            {i < count - 1 && (
              <span
                aria-hidden
                className="absolute top-12 bottom-0 left-6 border-l-2 border-dashed border-azure/40 lg:top-6 lg:right-[-1.5rem] lg:bottom-auto lg:left-14 lg:border-t-2 lg:border-l-0"
              />
            )}
            <span
              aria-hidden
              className="relative grid size-12 place-items-center rounded-full bg-brand font-serif text-xl text-white shadow-[0_0_0_6px_var(--color-brand-tint)]"
            >
              {i + 1}
            </span>
            <div className="lg:mt-5">
              <h3 className="text-lead font-bold text-ink">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              {step.text && <p className="mt-1.5 text-body">{step.text}</p>}
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
