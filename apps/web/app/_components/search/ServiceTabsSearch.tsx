"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  carBookingHref,
  carSearchFromCard,
  type CarSearchIssue,
} from "../../_lib/car-booking";
import { PRODUCTS, visibleFields, type Product } from "../../_lib/search";
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
 * Only car with driver can be sent: it goes to the options page with the
 * search in the URL. The other tabs are disabled until their flows exist.
 * `destination` fills in where the trip starts or goes, and may change while
 * the box is on screen.
 */
export function ServiceTabsSearch({ destination }: { destination?: string }) {
  const router = useRouter();
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
  const [issues, setIssues] = useState<CarSearchIssue[]>([]);
  const fields = visibleFields(product, values);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = carSearchFromCard(values);
    if (!result.ok) {
      setIssues(result.issues);
      return;
    }
    setIssues([]);
    router.push(carBookingHref(result.params));
  }

  return (
    // No overflow clip on the card: the place fields open a suggestion list
    // below themselves that must be free to hang past its bottom edge.
    <div className="rounded-[18px] bg-white text-[#102825] shadow-[0_22px_55px_rgba(9,43,39,0.16)] sm:rounded-[22px]">
      <div
        role="tablist"
        aria-label="Choose a travel service"
        className="flex snap-x snap-mandatory overflow-x-auto rounded-t-[inherit] border-b border-[#dce3e0] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6"
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
              disabled={!p.bookable}
              title={p.bookable ? undefined : "Coming soon"}
              onClick={() => setProduct(p.key)}
              className={`relative flex min-h-[54px] shrink-0 snap-start items-center justify-center gap-2.5 border-r border-[#edf0ef] px-4 py-3 text-[0.83rem] font-semibold whitespace-nowrap last:border-r-0 disabled:cursor-not-allowed disabled:text-[#64706d]/60 sm:text-[0.95rem] lg:min-h-[58px] ${
                on
                  ? "bg-[#e8f2ef] text-[#073c36]"
                  : "bg-white enabled:hover:bg-[#f5f9f7]"
              } ${focus}`}
            >
              <ProductIcon
                service={p.key}
                className="h-5 w-5 shrink-0 stroke-[1.8]"
              />
              <span>{p.label}</span>
              {!p.bookable && (
                <span className="rounded-full bg-[#f1f4f3] px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.08em] uppercase">
                  Soon
                </span>
              )}
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
        onSubmit={submit}
        noValidate
        className="px-3.5 py-[18px] sm:p-6"
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:flex lg:gap-0">
          {fields.map((f, i) => {
            const id = `svc-${f.key}`;
            const issue = issues.find((x) => x.field === f.key);
            const wide = f.kind === "place";
            return (
              <div
                key={f.key}
                className={`min-h-[68px] min-w-0 rounded-xl border bg-white px-[18px] py-2.5 focus-within:relative focus-within:z-10 focus-within:border-[#073c36] lg:rounded-none ${
                  issue ? "border-[#b3261e]" : "border-[#dce3e0]"
                } ${i === 0 ? "lg:rounded-l-[14px]" : "lg:-ml-px"} ${
                  wide ? "lg:flex-[2]" : "lg:flex-1"
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
                  onChange={(v, placeId) => set(f.key, v, placeId)}
                  className="min-h-[30px] w-full border-0 bg-transparent px-0 pt-1 pb-0 text-[#64706d] outline-none placeholder:text-[#64706d]/80 focus:text-[#082f2b]"
                />
              </div>
            );
          })}
          <button
            type="submit"
            className={`flex min-h-[65px] items-center justify-center rounded-[14px] bg-[#073c36] px-5 text-[1.02rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(7,60,54,0.18)] hover:bg-[#0b5048] lg:ml-3.5 lg:min-h-0 lg:w-[190px] lg:shrink-0 ${focus}`}
          >
            {product.cta} &nbsp;→
          </button>
        </div>

        {issues.length > 0 && (
          <p role="alert" className="mx-1 mt-3 text-[0.92rem] text-[#b3261e]">
            {issues.map((x) => x.message).join(" ")}
          </p>
        )}
      </form>
    </div>
  );
}
