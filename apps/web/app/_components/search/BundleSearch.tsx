"use client";

import { useState } from "react";
import {
  PRODUCTS,
  PRODUCT_LIST,
  bundleFields,
  searchHref,
  useSearchValues,
  type ProductKey,
} from "../../_lib/search";
import { ProductIcon } from "../Brand";
import { WhatsAppIcon } from "../WhatsAppIcon";
import { FieldInput, Stepper } from "./fields";
import motion from "./search.module.css";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#157a74]";
const input =
  "mt-0.5 w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-[#10201f] placeholder:font-normal placeholder:text-[#8a9a97] focus-visible:outline-none";

/**
 * Design 1 for a travel agent. The products are switches, not tabs, so a guest
 * can ask for a car, a hotel and attraction tickets in one go. Where, when and
 * who are asked once; every product switched on adds only its own fields,
 * marked with its icon so it is clear why they appeared.
 */
export function BundleSearch() {
  const [chosen, setChosen] = useState<ProductKey[]>(["car", "hotel"]);
  const { values, set } = useSearchValues();

  // Kept in the order the products are listed, however they were switched on.
  const keys = PRODUCT_LIST.map((p) => p.key).filter((k) => chosen.includes(k));
  const fields = bundleFields(keys);
  const products = keys.map((k) => PRODUCTS[k]);
  const href = searchHref(products, fields, values);

  function toggle(key: ProductKey) {
    setChosen((now) => {
      if (!now.includes(key)) return [...now, key];
      // One product always stays on; an empty request means nothing.
      return now.length > 1 ? now.filter((k) => k !== key) : now;
    });
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      aria-label="Trip request"
      className="rounded-2xl bg-white p-4 text-[#10201f] shadow-[0_24px_60px_-28px_rgba(12,59,58,0.45)] ring-1 ring-[#0c3b3a]/5 sm:p-5"
    >
      <fieldset>
        <legend className="text-sm text-[#3f5653]">
          <span className="font-(family-name:--font-display) text-base font-bold text-[#0c3b3a]">
            What do you need?
          </span>{" "}
          Pick one or combine them.
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRODUCT_LIST.map((p) => {
            const on = chosen.includes(p.key);
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.key)}
                className={`inline-flex items-center gap-2 rounded-full border py-2 pr-4 pl-3 text-sm font-semibold transition-colors motion-reduce:transition-none ${
                  on
                    ? "border-[#0c3b3a] bg-[#0c3b3a] text-white"
                    : "border-[#c9d6d3] text-[#3f5653] hover:border-[#157a74] hover:text-[#0c3b3a]"
                } ${focus}`}
              >
                <span
                  aria-hidden
                  className={`grid h-5 w-5 place-items-center rounded-full text-xs leading-none ${
                    on ? "bg-[#e4a93c] text-[#10201f]" : "bg-[#e8f2ef]"
                  }`}
                >
                  {on ? "✓" : "+"}
                </span>
                <ProductIcon service={p.key} className="h-[18px] w-[18px]" />
                {p.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => {
          const id = `bs-${f.key}`;
          const tag = f.owner && (
            <ProductIcon
              service={f.owner}
              className="h-3.5 w-3.5 text-[#157a74]"
            />
          );
          return (
            <div
              key={f.key}
              className={`${f.owner ? motion.join : ""} min-w-0 rounded-xl border border-[#d5e2de] px-3.5 py-2.5 focus-within:border-[#157a74] focus-within:bg-[#f6faf8] hover:border-[#157a74] ${
                f.kind === "place" ? "lg:col-span-2" : ""
              }`}
            >
              {f.kind === "count" ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#5a6b68] uppercase">
                    {tag}
                    {f.label}
                  </p>
                  <Stepper
                    def={f}
                    values={values}
                    onChange={(v) => set(f.key, v)}
                    size="h-8 w-8"
                  />
                </div>
              ) : (
                <>
                  <label
                    htmlFor={id}
                    className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#5a6b68] uppercase"
                  >
                    {tag}
                    {f.label}
                  </label>
                  <FieldInput
                    def={f}
                    id={id}
                    values={values}
                    onChange={(v) => set(f.key, v)}
                    className={input}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-[#3f5653]">
          One request, one reply:{" "}
          <span className="font-semibold text-[#0c3b3a]">
            {products.map((p) => p.label.toLowerCase()).join(" + ")}
          </span>
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#e4a93c] px-7 py-3.5 font-(family-name:--font-display) font-bold text-[#10201f] hover:bg-[#f0b94d] sm:w-auto ${focus}`}
        >
          <WhatsAppIcon className="h-5 w-5" />
          {products.length > 1 ? "Price it all together" : "Get my price"}
        </a>
      </div>
    </form>
  );
}
