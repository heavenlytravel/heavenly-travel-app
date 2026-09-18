"use client";

import { useState } from "react";
import {
  PRODUCT_LIST,
  addDays,
  daysToSaturday,
  isoDateFromNow,
  readable,
  type FieldDef,
  type FieldKey,
  type SearchValues,
} from "../../_lib/search";
import { useSearch } from "../../_lib/useSearch";
import { ProductIcon } from "../Brand";
import { FieldInput, Stepper } from "./fields";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#157a74]";
const chip = `rounded-full border border-[#c9d6d3] bg-white px-3.5 py-1.5 text-sm font-medium text-[#0c3b3a] hover:border-[#157a74] hover:bg-[#e8f2ef] ${focus}`;
const input =
  "w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-[#10201f] placeholder:font-normal placeholder:text-[#8a9a97] focus-visible:outline-none";

const TIMES = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

type Pick = { label: string; value: () => string };

/** One-tap answers for a date field; an end date counts on from the start. */
function datePicks(def: FieldDef, values: SearchValues): Pick[] {
  if (def.key === "endDate") {
    const start = values.date || isoDateFromNow(0);
    return [1, 2, 3, 7].map((n) => ({
      label:
        n === 7 ? "A week later" : `${n} ${n === 1 ? "day" : "days"} later`,
      value: () => addDays(start, n),
    }));
  }
  return [
    { label: "Today", value: () => isoDateFromNow(0) },
    { label: "Tomorrow", value: () => isoDateFromNow(1) },
    { label: "This Saturday", value: () => isoDateFromNow(daysToSaturday()) },
    { label: "In a week", value: () => isoDateFromNow(7) },
  ];
}

/**
 * Design 1 with a guide. The fields sit in one joined bar, and a tray under it
 * follows the field you are on with one-tap answers: popular places, quick
 * dates, common times, a stepper for people. Picking an answer moves you to
 * the next field, so a whole request can be made without typing.
 */
export function GuidedSearch() {
  const { product, setProduct, values, set, href } = useSearch();
  const [activeKey, setActiveKey] = useState<FieldKey | null>(null);
  const fields = product.fields;
  const active = fields.find((f) => f.key === activeKey) ?? fields[0];
  if (!active) return null;

  /** Take an answer from the tray and move on to the next field. */
  function answer(value: string) {
    if (!active) return;
    set(active.key, value);
    const next = fields[fields.indexOf(active) + 1];
    if (!next) return;
    setActiveKey(next.key);
    document.getElementById(`gs-${next.key}`)?.focus();
  }

  const picks: Pick[] =
    active.kind === "place"
      ? (active.suggestions ?? []).map((s) => ({ label: s, value: () => s }))
      : active.kind === "date"
        ? datePicks(active, values)
        : active.kind === "time"
          ? TIMES.map((t) => ({ label: t, value: () => t }))
          : [];

  return (
    <div className="rounded-2xl bg-white p-2 text-[#10201f] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)]">
      <div
        role="tablist"
        aria-label="Product"
        className="flex gap-1 overflow-x-auto px-1 pt-1 [scrollbar-width:none]"
      >
        {PRODUCT_LIST.map((p) => {
          const on = p.key === product.key;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`gs-tab-${p.key}`}
              aria-selected={on}
              aria-controls="gs-panel"
              onClick={() => {
                setProduct(p.key);
                setActiveKey(null);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${
                on
                  ? "bg-[#0c3b3a] text-white"
                  : "text-[#3f5653] hover:bg-[#f1f5f4]"
              } ${focus}`}
            >
              <ProductIcon service={p.key} className="h-[18px] w-[18px]" />
              {p.label}
            </button>
          );
        })}
      </div>

      <form
        id="gs-panel"
        role="tabpanel"
        aria-labelledby={`gs-tab-${product.key}`}
        onSubmit={(e) => e.preventDefault()}
        className="p-2 pt-3"
      >
        {/* The joined bar */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#c9d6d3] md:flex-row md:items-stretch">
          {fields.map((f, i) => {
            const on = f.key === active.key;
            const id = `gs-${f.key}`;
            return (
              <div
                key={f.key}
                className={`relative min-w-0 px-4 py-2.5 ${
                  f.kind === "place"
                    ? "md:flex-[1.4]"
                    : f.kind === "date"
                      ? "md:min-w-[10.75rem] md:flex-1"
                      : "md:flex-1"
                } ${i > 0 ? "border-t border-[#dfe7e4] md:border-t-0 md:border-l" : ""} ${
                  on ? "bg-[#eef7f3]" : "hover:bg-[#f7faf9]"
                }`}
              >
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-[#157a74]"
                  />
                )}
                <label
                  htmlFor={id}
                  className="block text-[11px] font-semibold tracking-wide text-[#5a6b68] uppercase"
                >
                  {f.label}
                </label>
                {f.kind === "count" ? (
                  <button
                    type="button"
                    id={id}
                    aria-expanded={on}
                    aria-controls="gs-tray"
                    onClick={() => setActiveKey(f.key)}
                    className={`${input} text-left ${focus}`}
                  >
                    {readable(f, values[f.key]) || "None"}
                  </button>
                ) : (
                  <FieldInput
                    def={f}
                    id={id}
                    values={values}
                    onChange={(v) => set(f.key, v)}
                    onFocus={() => setActiveKey(f.key)}
                    className={input}
                  />
                )}
              </div>
            );
          })}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`m-1.5 inline-flex items-center justify-center rounded-lg bg-[#e4a93c] px-7 py-3 font-(family-name:--font-display) text-base font-bold whitespace-nowrap text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
          >
            {product.cta}
          </a>
        </div>

        {/* The tray follows the active field */}
        <div
          id="gs-tray"
          role="group"
          aria-label={`Quick answers for ${active.label}`}
          className="flex min-h-12 flex-wrap items-center gap-2 px-1 pt-3"
        >
          <span className="mr-1 text-xs font-semibold text-[#5a6b68]">
            {active.label}
          </span>
          {active.kind === "count" ? (
            <Stepper
              def={active}
              values={values}
              onChange={(v) => set(active.key, v)}
            />
          ) : (
            picks.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => answer(p.value())}
                className={chip}
              >
                {p.label}
              </button>
            ))
          )}
        </div>
      </form>
    </div>
  );
}
