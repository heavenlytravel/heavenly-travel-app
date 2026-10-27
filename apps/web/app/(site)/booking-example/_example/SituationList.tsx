"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckIcon, XIcon } from "@repo/ui/icons";
import { PageTitle, panel, primaryButton } from "../../_components/Page";
import { SITUATIONS, STEP_PATHS, type Step } from "./situations";
import { freshState, update } from "./store";

const STEP_NAMES: Record<Step, string> = {
  search: "Search",
  vehicle: "Vehicle",
  confirm: "Confirm",
  received: "Received",
  booking: "Your booking",
};

const RULES: { allowed: boolean; text: string }[] = [
  {
    allowed: true,
    text: "Any number of trips in one booking, each with its own day, time and places",
  },
  { allowed: true, text: "One-way and hourly, mixed as you like" },
  {
    allowed: true,
    text: "A return is two one-way trips, and a hire for three days is three hourly trips, each added on its own",
  },
  {
    allowed: false,
    text: "More than one vehicle, or a different vehicle on some trips",
  },
  {
    allowed: false,
    text: "Two trips at once: a trip cannot start while another is still going",
  },
];

/** The example's front page: the rules, then start from the search or open a situation. */
export function SituationList() {
  const router = useRouter();

  function open(load: () => ReturnType<typeof freshState>, step: Step) {
    update(load);
    router.push(STEP_PATHS[step]);
  }

  return (
    <>
      <PageTitle eyebrow="Booking example" title="Every way to book.">
        Start from the search and build any booking, or open a situation below:
        each loads sample trips and opens the step it is about.
      </PageTitle>

      <section className={`${panel} mb-8 max-w-[720px]`}>
        <h2 className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
          One booking, one vehicle
        </h2>
        <ul className="grid gap-2">
          {RULES.map((rule) => (
            <li key={rule.text} className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                  rule.allowed
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-[#fdecea] text-[#b3261e]"
                }`}
              >
                {rule.allowed ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <XIcon className="size-3.5" />
                )}
              </span>
              <span className="text-slate-700">{rule.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => open(freshState, "search")}
        className={`${primaryButton} mb-10 gap-2`}
      >
        Start from the search
        <ArrowRightIcon className="size-4" />
      </button>

      <div className="grid gap-10">
        {SITUATIONS.map((group) => (
          <section
            key={group.title}
            className={
              group.notAllowed
                ? "rounded-[22px] border-2 border-dashed border-[#e8b4ae] bg-[#fdf3f2] p-4 sm:p-6"
                : ""
            }
          >
            <h2 className="font-(family-name:--font-display) text-[1.6rem] text-ink">
              {group.title}
            </h2>
            <p className="mt-1 mb-4 max-w-[70ch] text-[0.95rem] text-slate-600">
              {group.text}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => open(s.load, s.step)}
                  className={`group flex flex-col items-start gap-1 rounded-[16px] border bg-white p-4 text-left shadow-[0_8px_24px_rgba(0,38,75,0.05)] ${
                    group.notAllowed
                      ? "border-[#f0cdc8] hover:border-[#b3261e]"
                      : "border-slate-200 hover:border-brand"
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold text-ink">
                    {group.notAllowed ? (
                      <XIcon className="size-4 shrink-0 text-[#b3261e]" />
                    ) : null}
                    {s.title}
                  </span>
                  <span className="text-[0.92rem] text-slate-600">
                    {s.text}
                  </span>
                  <span
                    className={`mt-2 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold ${
                      group.notAllowed ? "text-[#b3261e]" : "text-brand"
                    }`}
                  >
                    {group.notAllowed ? "See how it is stopped on" : "Opens on"}{" "}
                    {STEP_NAMES[s.step]}
                    <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
