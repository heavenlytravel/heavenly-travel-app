"use client";

import { XIcon } from "@repo/ui/icons";
import {
  fieldKeys,
  PRODUCTS,
  visibleFields,
  type FieldDef,
  type Product,
  type SearchValues,
} from "../../_lib/search";
import { bookableCategory } from "../../_lib/transportation-booking";
import { useTripSubmit } from "../../_lib/useSearch";
import { Pending } from "../../(site)/_components/Page";
import { ProductIcon } from "../Brand";
import { useSearchCard } from "./SearchProvider";
import { FieldIcon, FieldInput } from "./fields";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-azure";

/** All six services, in the order the tabs show them. */
const TABS: Product[] = [
  PRODUCTS["car-with-driver"],
  PRODUCTS["coach-charter"],
  PRODUCTS.attraction,
  PRODUCTS.hotel,
  PRODUCTS.rental,
  PRODUCTS.package,
];

/**
 * Six services as a row of icon tabs, then one joined row of fields that
 * changes with the service, and a blue button of fixed width at the end.
 * Car with driver and coach charter can be sent: each goes to the options
 * page of its category with the search in the URL. The other tabs are
 * disabled until their flows exist. Its state is the `SearchProvider`'s
 * above it, which is how a card elsewhere on the page fills a place in.
 * The button says so while the options page prices the trip, which is
 * the longest wait on the site. On a location's pages the place fields
 * suggest the location's area first, and any trip is sent as from the
 * home page: the options page says which location prices it, or why none
 * can. Each label leads with its field's
 * icon, and a filled place or day has an × at its end that empties it.
 */
export function ServiceTabsSearch() {
  const { product, setProduct, values, set, presetsOf, near } = useSearchCard();
  const { issues, pending, submit: sendTrip } = useTripSubmit();
  const fields = visibleFields(product, values);

  /** Empties the field, a day and its time together, and puts the cursor back in it. */
  function clear(def: FieldDef, id: string) {
    for (const key of fieldKeys(def)) set(key, "");
    document.getElementById(id)?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const category = bookableCategory(product.key);
    if (category) sendTrip(category, values);
  }

  return (
    // No overflow clip on the card: the place fields open a suggestion list
    // below themselves that must be free to hang past its bottom edge.
    <div className="rounded-[18px] bg-white text-slate-900 shadow-[0_22px_55px_rgba(0,38,75,0.16)] sm:rounded-[22px]">
      <div
        role="tablist"
        aria-label="Choose a travel service"
        className="flex snap-x snap-mandatory overflow-x-auto rounded-t-[inherit] border-b border-slate-200 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6"
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
              className={`relative flex min-h-[54px] shrink-0 snap-start items-center justify-center gap-2.5 border-r border-slate-100 px-4 py-3 text-[0.83rem] font-semibold whitespace-nowrap last:border-r-0 disabled:cursor-not-allowed disabled:text-slate-500/60 sm:text-[0.95rem] lg:min-h-[58px] ${
                on
                  ? "bg-brand-tint text-brand"
                  : "bg-white enabled:hover:bg-slate-50"
              } ${focus}`}
            >
              <ProductIcon
                service={p.key}
                className="h-5 w-5 shrink-0 stroke-[1.8]"
              />
              <span>{p.label}</span>
              {!p.bookable && (
                // Out of the flow, so it never widens the tab past its column.
                <span className="absolute top-1.5 right-2 text-[0.55rem] leading-none font-bold tracking-[0.12em] text-azure uppercase">
                  Soon
                </span>
              )}
              {on && (
                <span
                  aria-hidden
                  className="absolute bottom-0 h-[3px] w-[50px] rounded-[3px] bg-azure"
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
            const keys = fieldKeys(f);
            const issue = issues.find((x) =>
              keys.some((key) => key === x.field),
            );
            const clearable = isClearable(f, values);
            // The field fills its box, its label laid over the top of it:
            // a click anywhere in the box reaches the field, and its list
            // or calendar opens under the box, lined up with its edges.
            return (
              <div
                key={f.key}
                className={`relative grid min-w-0 grid-cols-1 rounded-xl border bg-white focus-within:z-10 focus-within:border-brand lg:rounded-none ${
                  issue ? "border-[#b3261e]" : "border-slate-200"
                } ${i === 0 ? "lg:rounded-l-[14px]" : "lg:-ml-px"} ${
                  f.kind === "place"
                    ? "lg:flex-[2]"
                    : f.kind === "when"
                      ? "lg:flex-[1.5]"
                      : "lg:flex-1"
                }`}
              >
                <label
                  htmlFor={id}
                  className="pointer-events-none absolute top-2.5 left-[18px] flex items-center gap-1.5 text-[0.82rem]/5 font-semibold text-slate-800"
                >
                  <FieldIcon def={f} className="size-[15px] text-slate-500" />
                  {f.label}
                </label>
                <FieldInput
                  def={f}
                  id={id}
                  values={values}
                  presets={presetsOf(f.key)}
                  near={near}
                  onChange={set}
                  className={`h-full min-h-[70px] w-full border-0 bg-transparent pt-[34px] pb-2.5 pl-[18px] text-slate-500 outline-none placeholder:text-slate-500/80 focus:text-ink data-placeholder:text-slate-500/80 ${
                    clearable ? "pr-11" : "pr-[18px]"
                  }`}
                />
                {clearable && (
                  <button
                    type="button"
                    aria-label={`Clear ${f.label}`}
                    onClick={() => clear(f, id)}
                    className={`absolute right-2.5 bottom-[11px] flex size-7 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink ${focus}`}
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="submit"
            disabled={pending}
            className={`flex min-h-[65px] items-center justify-center rounded-[14px] bg-brand px-5 text-[1.02rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(4,107,210,0.18)] hover:bg-brand-strong disabled:cursor-wait disabled:opacity-70 lg:ml-3.5 lg:min-h-0 lg:w-[190px] lg:shrink-0 ${focus}`}
          >
            {pending ? (
              <Pending>Finding prices…</Pending>
            ) : (
              <>{product.cta} &nbsp;→</>
            )}
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

/** Whether a field shows its ×: a place or a day with something in it. */
function isClearable(def: FieldDef, values: SearchValues) {
  if (def.kind !== "place" && def.kind !== "when" && def.kind !== "date") {
    return false;
  }
  return fieldKeys(def).some((key) => values[key] !== "");
}
