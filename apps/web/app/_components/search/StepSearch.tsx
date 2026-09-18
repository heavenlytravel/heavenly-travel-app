"use client";

import { useState } from "react";
import {
  MAIN_SERVICES,
  MAIN_SERVICE_NOTES,
  SERVICE_LABELS,
  mainServiceOf,
  useTrip,
  type Trip,
} from "../../_lib/trip";
import { ProductIcon } from "../Brand";
import { WhatsAppIcon } from "../WhatsAppIcon";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";
const field =
  "w-full border-0 border-b-2 border-white/25 bg-transparent px-0 py-2.5 font-(family-name:--font-display) text-2xl font-semibold text-white placeholder:font-normal placeholder:text-white/35 hover:border-white/50 focus-visible:border-[#e4a93c] focus-visible:outline-none [color-scheme:dark]";

type Step = {
  key: "service" | "from" | "to" | "when" | "passengers";
  question: string;
  /** How the answer reads in the summary row; empty when not answered yet. */
  answer: (trip: Trip) => string;
};

const STEPS: Step[] = [
  {
    key: "service",
    question: "What are you booking?",
    answer: (t) => SERVICE_LABELS[mainServiceOf(t.service)],
  },
  { key: "from", question: "Where do we pick you up?", answer: (t) => t.from },
  { key: "to", question: "Where are you going?", answer: (t) => t.to },
  {
    key: "when",
    question: "When do you travel?",
    answer: (t) => [t.date, t.time].filter(Boolean).join(", "),
  },
  {
    key: "passengers",
    question: "How many passengers?",
    answer: (t) => (t.passengers ? `${t.passengers} passengers` : ""),
  },
];

/**
 * Idea: one question at a time. A small card that never shows more than one
 * field, keeps the answers as chips you can go back to, and ends on the send
 * button.
 */
export function StepSearch() {
  const { trip, set, whatsappHref } = useTrip();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  if (!step) return null;

  const last = index === STEPS.length - 1;
  const next = () => setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  const answered = STEPS.slice(0, index);
  const inputId = `st-${step.key}`;
  /** Set when the step is a plain text answer stored under its own key. */
  const place = step.key === "from" || step.key === "to" ? step.key : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      aria-label="Trip request, one question at a time"
      className="flex min-h-[21rem] flex-col rounded-2xl bg-[#0c3b3a] p-6 text-white shadow-[0_24px_60px_-28px_rgba(12,59,58,0.8)] sm:p-7"
    >
      <div className="flex items-center justify-between gap-4">
        <ol aria-label="Progress" className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <li
              key={s.key}
              aria-current={i === index ? "step" : undefined}
              className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                i === index
                  ? "w-8 bg-[#e4a93c]"
                  : i < index
                    ? "w-4 bg-white/70"
                    : "w-4 bg-white/20"
              }`}
            >
              <span className="sr-only">{s.question}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs font-semibold text-white/60 tabular-nums">
          {index + 1} of {STEPS.length}
        </p>
      </div>

      {answered.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {answered.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Change: ${s.question}`}
                className={`rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85 hover:bg-white/20 ${focus}`}
              >
                {s.answer(trip) || "Skipped"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex-1">
        {step.key === "service" ? (
          <fieldset>
            <legend className="font-(family-name:--font-display) text-lg font-semibold">
              {step.question}
            </legend>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {MAIN_SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={mainServiceOf(trip.service) === s}
                  onClick={() => {
                    set("service", s);
                    next();
                  }}
                  className={`flex items-center gap-3 rounded-xl border border-white/20 p-4 text-left hover:border-[#e4a93c] hover:bg-white/5 aria-pressed:border-[#e4a93c] ${focus}`}
                >
                  <ProductIcon service={s} className="h-7 w-7 text-[#e4a93c]" />
                  <span>
                    <span className="block font-semibold">
                      {SERVICE_LABELS[s]}
                    </span>
                    <span className="block text-xs text-white/60">
                      {MAIN_SERVICE_NOTES[s]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <>
            <label
              htmlFor={inputId}
              className="block font-(family-name:--font-display) text-lg font-semibold"
            >
              {step.question}
            </label>
            {step.key === "when" ? (
              <div className="mt-3 grid grid-cols-[1.4fr_1fr] gap-4">
                <input
                  key={inputId}
                  id={inputId}
                  type="date"
                  autoFocus
                  className={field}
                  value={trip.date}
                  onChange={(e) => set("date", e.target.value)}
                />
                <input
                  type="time"
                  aria-label="Pick-up time"
                  className={field}
                  value={trip.time}
                  onChange={(e) => set("time", e.target.value)}
                />
              </div>
            ) : place === null ? (
              <input
                key={inputId}
                id={inputId}
                type="number"
                min={1}
                inputMode="numeric"
                autoFocus
                placeholder="2"
                className={`${field} mt-3`}
                value={trip.passengers}
                onChange={(e) => set("passengers", e.target.value)}
              />
            ) : (
              <input
                key={inputId}
                id={inputId}
                autoFocus
                autoComplete="off"
                placeholder={
                  place === "from" ? "KLIA Terminal 1" : "Cameron Highlands"
                }
                className={`${field} mt-3`}
                value={trip[place]}
                onChange={(e) => set(place, e.target.value)}
              />
            )}
          </>
        )}
      </div>

      {index > 0 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white ${focus}`}
          >
            Back
          </button>
          {last ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2.5 rounded-full bg-[#e4a93c] px-6 py-3 font-(family-name:--font-display) font-bold text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
            >
              <WhatsAppIcon className="h-5 w-5" />
              Send for a price
            </a>
          ) : (
            <button
              type="submit"
              className={`rounded-full bg-white px-6 py-3 font-(family-name:--font-display) font-bold text-[#0c3b3a] hover:bg-[#e4a93c] ${focus}`}
            >
              Next
            </button>
          )}
        </div>
      )}
    </form>
  );
}
