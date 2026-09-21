"use client";

import { useState } from "react";
import { PRODUCTS, searchHref, type Product } from "../../_lib/search";
import { useSearch } from "../../_lib/useSearch";
import { ProductIcon } from "../Brand";
import { FieldInput } from "./fields";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

/** All six services, in the order the tabs show them. */
const TABS: Product[] = [
  PRODUCTS.car,
  PRODUCTS.coach,
  PRODUCTS.attraction,
  PRODUCTS.hotel,
  PRODUCTS.rental,
  PRODUCTS.package,
];

/**
 * Six services as a row of icon tabs, then one joined row of fields that
 * changes with the service, and a deep green button of fixed width at the end.
 * `destination` fills in where the trip starts or goes, and may change while
 * the box is on screen.
 */
export function ServiceTabsSearch({ destination }: { destination?: string }) {
  const { product, setProduct, values, set } = useSearch(
    PRODUCTS.car.key,
    destination ? { from: destination, place: destination } : {},
  );
  // A newly chosen destination overwrites the place, whatever was typed, and
  // leaves the service and the other fields alone.
  const [applied, setApplied] = useState(destination);
  if (destination !== applied) {
    setApplied(destination);
    set("from", destination ?? "");
    set("place", destination ?? "");
  }
  const [sameLocation, setSameLocation] = useState(true);
  const rental = product.key === "rental";
  const href = searchHref(
    [product],
    product.fields,
    values,
    rental
      ? [`Return to the same location: ${sameLocation ? "yes" : "no"}`]
      : [],
  );

  return (
    <div className="overflow-hidden rounded-[18px] bg-white text-[#102825] shadow-[0_22px_55px_rgba(9,43,39,0.16)] sm:rounded-[22px]">
      <div
        role="tablist"
        aria-label="Choose a travel service"
        className="flex snap-x snap-mandatory overflow-x-auto border-b border-[#dce3e0] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6"
      >
        {TABS.map((p) => {
          const on = p.key === product.key;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`svc-tab-${p.key}`}
              aria-selected={on}
              aria-controls="svc-panel"
              onClick={() => setProduct(p.key)}
              className={`relative flex min-h-[54px] shrink-0 snap-start items-center justify-center gap-2.5 border-r border-[#edf0ef] px-4 py-3 text-[0.83rem] font-semibold whitespace-nowrap last:border-r-0 sm:text-[0.95rem] lg:min-h-[58px] ${
                on
                  ? "bg-[#e8f2ef] text-[#073c36]"
                  : "bg-white hover:bg-[#f5f9f7]"
              } ${focus}`}
            >
              <ProductIcon
                service={p.key}
                className="h-5 w-5 shrink-0 stroke-[1.8]"
              />
              <span>{p.label}</span>
              {on && (
                <span
                  aria-hidden
                  className="absolute bottom-0 h-[3px] w-[50px] rounded-[3px] bg-[#caa243]"
                />
              )}
            </button>
          );
        })}
      </div>

      <form
        id="svc-panel"
        role="tabpanel"
        aria-labelledby={`svc-tab-${product.key}`}
        onSubmit={(e) => e.preventDefault()}
        className="px-3.5 py-[18px] sm:p-6"
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:flex lg:gap-0">
          {product.fields.map((f, i) => {
            const id = `svc-${f.key}`;
            return (
              <div
                key={f.key}
                className={`min-h-[68px] min-w-0 rounded-xl border border-[#dce3e0] bg-white px-[18px] py-2.5 focus-within:relative focus-within:z-10 focus-within:border-[#073c36] lg:rounded-none ${
                  i === 0
                    ? "lg:flex-[2] lg:rounded-l-[14px]"
                    : "lg:-ml-px lg:flex-1"
                }`}
              >
                <label
                  htmlFor={id}
                  className="block text-[0.82rem] font-semibold text-[#253c38]"
                >
                  {f.label}
                </label>
                <FieldInput
                  def={f}
                  id={id}
                  values={values}
                  onChange={(v) => set(f.key, v)}
                  className="min-h-[30px] w-full border-0 bg-transparent px-0 pt-1 pb-0 text-[#64706d] outline-none placeholder:text-[#64706d]/80 focus:text-[#082f2b]"
                />
              </div>
            );
          })}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex min-h-[65px] items-center justify-center rounded-[14px] bg-[#073c36] px-5 text-[1.02rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(7,60,54,0.18)] hover:bg-[#0b5048] lg:ml-3.5 lg:min-h-0 lg:w-[190px] lg:shrink-0 ${focus}`}
          >
            {product.cta} &nbsp;→
          </a>
        </div>

        {rental && (
          <label className="mx-1 mt-3 flex items-center gap-[9px] text-[0.92rem] text-[#324844]">
            <input
              type="checkbox"
              checked={sameLocation}
              onChange={(e) => setSameLocation(e.target.checked)}
              className={`h-[18px] w-[18px] accent-[#073c36] ${focus}`}
            />
            Return to the same location
          </label>
        )}
      </form>
    </div>
  );
}
