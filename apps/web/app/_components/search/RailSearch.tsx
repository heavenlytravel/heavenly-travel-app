"use client";

import { PRODUCT_LIST, summarise } from "../../_lib/search";
import { useSearch } from "../../_lib/useSearch";
import { ProductIcon } from "../Brand";
import { WhatsAppIcon } from "../WhatsAppIcon";
import { FieldInput, Stepper } from "./fields";
import motion from "./search.module.css";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";
const input =
  "mt-0.5 w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-white placeholder:font-normal placeholder:text-white/40 focus-visible:outline-none [color-scheme:dark]";

/**
 * Design 1 for a photo hero. The products move to a rail on the left so the
 * bar stays one clean row, the fields ease in when the product changes, and a
 * line under the bar reads the request back in plain words before it is sent.
 */
export function RailSearch() {
  const { product, setProduct, values, set, href } = useSearch("hotel");
  const summary = summarise(product, values);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl bg-[#071918]/80 text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/15 backdrop-blur-xl md:grid-cols-[12rem_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-label="Product"
        aria-orientation="vertical"
        className="grid min-w-0 grid-cols-2 gap-1 border-b border-white/10 p-2 md:flex md:flex-col md:border-r md:border-b-0"
      >
        {PRODUCT_LIST.map((p) => {
          const on = p.key === product.key;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`rs-tab-${p.key}`}
              aria-selected={on}
              aria-controls="rs-panel"
              onClick={() => setProduct(p.key)}
              className={`relative flex shrink-0 items-center gap-3 rounded-lg py-2.5 pr-5 pl-4 text-left text-sm font-semibold whitespace-nowrap ${
                on
                  ? "bg-white/12 text-white"
                  : "text-white/60 hover:bg-white/6 hover:text-white"
              } ${focus}`}
            >
              {on && (
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[#e4a93c]"
                />
              )}
              <ProductIcon
                service={p.key}
                className={`h-5 w-5 ${on ? "text-[#e4a93c]" : ""}`}
              />
              {p.label}
            </button>
          );
        })}
      </div>

      <form
        id="rs-panel"
        role="tabpanel"
        aria-labelledby={`rs-tab-${product.key}`}
        onSubmit={(e) => e.preventDefault()}
        className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5"
      >
        <p className="text-sm text-white/60">{product.note}</p>

        <div
          key={product.key}
          className={`${motion.swap} grid gap-2 sm:grid-cols-2 lg:flex lg:items-stretch`}
        >
          {product.fields.map((f) => {
            const id = `rs-${f.key}`;
            return (
              <div
                key={f.key}
                className={`min-w-0 rounded-lg bg-white/8 px-3.5 py-2.5 ring-1 ring-white/10 focus-within:bg-white/12 focus-within:ring-[#e4a93c] hover:ring-white/30 ${
                  f.kind === "place"
                    ? "lg:flex-[1.6]"
                    : f.kind === "date"
                      ? "lg:min-w-[9.5rem] lg:flex-1"
                      : "lg:flex-1"
                }`}
              >
                {f.kind === "count" ? (
                  <>
                    <p className="text-[11px] font-semibold tracking-wide text-white/55 uppercase">
                      {f.label}
                    </p>
                    <div className="mt-1">
                      <Stepper
                        def={f}
                        values={values}
                        onChange={(v) => set(f.key, v)}
                        tone="dark"
                        size="h-7 w-7"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <label
                      htmlFor={id}
                      className="block text-[11px] font-semibold tracking-wide text-white/55 uppercase"
                    >
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

        {/* The request read back, then the button that sends it */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p
            aria-live="polite"
            className="min-w-0 flex-1 basis-64 text-sm text-white/80"
          >
            {summary.length > 0 ? (
              <>
                <span className="mr-2 text-xs font-semibold tracking-wide text-[#e4a93c] uppercase">
                  Your request
                </span>
                {product.label}: {summary.join(" · ")}
              </>
            ) : (
              <span className="text-white/50">
                Fill in the bar and we reply on WhatsApp with a price in
                minutes.
              </span>
            )}
          </p>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#e4a93c] px-7 py-3 font-(family-name:--font-display) font-bold whitespace-nowrap text-[#10201f] hover:bg-[#f0b94d] sm:w-auto ${focus}`}
          >
            <WhatsAppIcon className="h-5 w-5" />
            {product.cta}
          </a>
        </div>
      </form>
    </div>
  );
}
