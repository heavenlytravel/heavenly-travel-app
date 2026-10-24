"use client";

import {
  formatMyr,
  localDateTimeInputs,
  type LngLat,
  type PriceCheck,
  type PriceCheckEnd,
  type ZoneShape,
} from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { DateField, TimeField } from "@repo/ui/date-field";
import { inputClassName } from "@repo/ui/field";
import { ArrowLeftRightIcon, ChevronDownIcon, CopyIcon } from "@repo/ui/icons";
import { Menu, MenuItem } from "@repo/ui/menu";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import { useId, useRef, useState, useTransition } from "react";
import { FormError } from "../../../../../_components/FormError";
import {
  FullScreenButton,
  useFullScreen,
} from "../../coverage/zones/full-screen";
import { tryTripAction, type TryEnd, type TryTripAnswer } from "./actions";
import {
  allLayers,
  breakdownText,
  explainCalculation,
  explainSteps,
  type LayerKey,
} from "./explain";
import { MAP_COLORS, TripMap, type TripPin } from "./TripMap";

/** What Google bills a route request past the free allowance, in US dollars. */
const ROUTE_REQUEST_USD = 0.005;

const DAY_MS = 24 * 60 * 60 * 1000;

type ClassChoice = { id: string; name: string; slug: string };

type TryTripProps = {
  locationId: string;
  locationName: string;
  /** The browser key for Google's map; null when it is not set. */
  mapKey: string | null;
  zones: { id: string; name: string; shape: ZoneShape }[];
  /** The classes on sale here: the ones a trip can be priced for. */
  classes: ClassChoice[];
  examples: PriceCheck[];
};

/**
 * Try a trip on the Rates tab: the controls on top, the map on the left
 * and the price on the right, which the button over the map puts in full
 * screen together. Nothing is booked or saved.
 */
export function TryTrip(props: TryTripProps) {
  if (props.classes.length === 0) {
    return (
      <p className="border-t border-slate-200 px-6 py-5 text-sm text-slate-600">
        Put a class on sale to try a trip in it.
      </p>
    );
  }
  return <Workspace {...props} />;
}

/** An end as the workspace holds it: the text in its field, and the place or the pin it stands for. */
type EndState = { text: string; end: TryEnd | null };

const EMPTY: EndState = { text: "", end: null };

const endOfCheck = (end: PriceCheckEnd): EndState => ({
  text: end.label,
  end:
    "placeId" in end
      ? { placeId: end.placeId, label: end.label }
      : { lat: end.lat, lng: end.lng, label: end.label },
});

const pinLabel = ([lng, lat]: LngLat) =>
  `Pin at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** The class a try starts in: the sedan, as most trips are, or the first on sale. */
const firstClass = (classes: ClassChoice[]) =>
  (
    classes.find((c) => c.slug === "sedan") ??
    classes.find((c) => /sedan/i.test(c.name)) ??
    classes[0]
  )?.id ?? "";

/**
 * Try a trip itself: a pickup and a drop-off, each a place from the
 * search or a pin on the map, a class (the sedan first), a pickup day and
 * time, priced by the website's own quote with the pickup kept to this
 * location and none of a booking's limits: any day, and an end as far
 * past its zone as any location may serve. What a customer would meet
 * instead is said over the price. The answer shows as the calculation, a
 * line each, picking one lighting up its roads on the map, or step by
 * step, each step with the call it made to Google, what came back and
 * what was worked out, the map redrawn for it. Pointing at a road on the
 * map says what it measures. Every try makes real calls; their count and
 * cost are under the steps. Below a wide screen the parts stack: the
 * controls, the map, then the price, and picking a line brings the map
 * back into view.
 */
function Workspace({
  locationId,
  locationName,
  mapKey,
  zones,
  classes,
  examples,
}: TryTripProps) {
  const ids = useId();
  const { ref: screen, full, toggle } = useFullScreen<HTMLDivElement>();
  const mapBox = useRef<HTMLDivElement>(null);
  const [pickup, setPickup] = useState<EndState>(EMPTY);
  const [dropoff, setDropoff] = useState<EndState>(EMPTY);
  const [classId, setClassId] = useState(() => firstClass(classes));
  // Tomorrow in Malaysia's time, the same on the server and in the browser.
  const [date, setDate] = useState(
    () => localDateTimeInputs(new Date(Date.now() + DAY_MS)).date,
  );
  const [time, setTime] = useState("10:00");
  /** Which end a click on the map places. */
  const [placing, setPlacing] = useState<"A" | "B">("A");
  const [answer, setAnswer] = useState<TryTripAnswer | null>(null);
  const [view, setView] = useState<"calculation" | "steps">("calculation");
  const [step, setStep] = useState(0);
  /** The calculation line picked, whose roads the map lights up. */
  const [picked, setPicked] = useState<number | null>(null);
  const [pointed, setPointed] = useState<number | null>(null);
  const [frame, setFrame] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = { pickup, dropoff, classId, date, time };
  type Current = typeof current;

  function run(next: Current) {
    if (!next.pickup.end || !next.dropoff.end || !next.classId) return;
    const input = {
      pickup: next.pickup.end,
      dropoff: next.dropoff.end,
      vehicleClassId: next.classId,
      date: next.date,
      time: next.time,
    };
    startTransition(async () => {
      const answered = await answerOf(tryTripAction(locationId, input));
      setAnswer(
        "ok" in answered ? answered : { ok: false, error: answered.error },
      );
      setStep(0);
      setPicked(null);
      setCopied(false);
      setFrame((n) => n + 1);
    });
  }

  function change(patch: Partial<Current>) {
    const next = { ...current, ...patch };
    if (patch.pickup) setPickup(patch.pickup);
    if (patch.dropoff) setDropoff(patch.dropoff);
    if (patch.classId !== undefined) setClassId(patch.classId);
    if (patch.date !== undefined) setDate(patch.date);
    if (patch.time !== undefined) setTime(patch.time);
    run(next);
  }

  function pin(letter: "A" | "B", at: LngLat) {
    const end: EndState = {
      text: pinLabel(at),
      end: { lng: at[0], lat: at[1], label: pinLabel(at) },
    };
    if (letter === "A") {
      change({ pickup: end });
      setPlacing("B");
    } else {
      change({ dropoff: end });
    }
  }

  function example(check: PriceCheck) {
    const chosen = classes.find((c) => c.slug === check.class);
    change({
      pickup: endOfCheck(check.pickup),
      dropoff: endOfCheck(check.dropoff),
      ...(chosen ? { classId: chosen.id } : {}),
    });
  }

  const answered = answer?.ok ? answer : null;
  const steps = answered ? explainSteps(answered) : [];
  const shownStep = steps[Math.min(step, steps.length - 1)];
  const lines = answered ? explainCalculation(answered) : [];
  const layers = answered
    ? view === "steps" && shownStep
      ? shownStep.layers
      : allLayers(answered)
    : [];
  const lit = pointed ?? picked;
  const focus: LayerKey[] =
    view === "calculation" && lit !== null ? (lines[lit]?.focus ?? []) : [];
  const pinAt = (state: EndState, fromAnswer: LngLat | undefined) =>
    state.end && "lat" in state.end
      ? ([state.end.lng, state.end.lat] as LngLat)
      : fromAnswer;
  const pins: TripPin[] = [
    { letter: "A" as const, at: pinAt(pickup, answered?.pickup.at) },
    { letter: "B" as const, at: pinAt(dropoff, answered?.dropoff.at) },
  ].flatMap((p) => (p.at ? [{ letter: p.letter, at: p.at }] : []));
  const calls = answered?.trace.calls ?? 0;
  const className = classes.find((c) => c.id === classId)?.name ?? "";

  /** A calculation line picked or put back; stacked, the map comes back into view to show it. */
  function pick(index: number) {
    const next = picked === index ? null : index;
    setPicked(next);
    if (next !== null && window.matchMedia("(max-width: 1023px)").matches) {
      mapBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function copy() {
    if (!answered) return;
    try {
      await navigator.clipboard.writeText(breakdownText(answered, className));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const endField = (
    letter: "A" | "B",
    label: string,
    state: EndState,
    set: (end: EndState) => void,
    clear: (text: string) => void,
  ) => (
    <div className="grid min-w-0 flex-1 basis-56 gap-1">
      <label
        htmlFor={`${ids}-${letter}`}
        className="text-xs font-medium text-slate-600"
      >
        {label} ({letter})
      </label>
      <PlaceInput
        id={`${ids}-${letter}`}
        value={state.text}
        placeId={
          state.end && "placeId" in state.end ? state.end.placeId : undefined
        }
        placeholder="A place, or a click on the map"
        className={inputClassName}
        onChange={(text, placeId) =>
          placeId ? set({ text, end: { placeId, label: text } }) : clear(text)
        }
      />
    </div>
  );

  return (
    <div
      ref={screen}
      className={cx(
        "border-t border-slate-200 bg-white",
        full && "flex h-full flex-col overflow-y-auto lg:overflow-hidden",
      )}
    >
      <div className="grid gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
        {full ? (
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Try a trip in {locationName}
          </h2>
        ) : null}
        {/* The two ends, then the class, the day and the time, which move
            under the ends as a group when a row cannot hold them all. */}
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          {/* On a phone, A over B with the swap beside both. */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-2 gap-y-3 sm:flex sm:min-w-0 sm:flex-[1_1_32rem] sm:gap-3">
            {endField(
              "A",
              "Pick-up",
              pickup,
              (end) => change({ pickup: end }),
              (text) => setPickup({ text, end: null }),
            )}
            <Button
              variant="secondary"
              className="w-10 px-0 max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:self-center max-sm:[&_svg]:rotate-90"
              aria-label="Swap the pick-up and the drop-off"
              title="Swap A and B"
              disabled={!pickup.end && !dropoff.end}
              onClick={() => change({ pickup: dropoff, dropoff: pickup })}
            >
              <ArrowLeftRightIcon />
            </Button>
            {endField(
              "B",
              "Drop-off",
              dropoff,
              (end) => change({ dropoff: end }),
              (text) => setDropoff({ text, end: null }),
            )}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="col-span-2 grid gap-1 sm:w-44">
              <span className="text-xs font-medium text-slate-600">Class</span>
              <Select
                aria-label="Class"
                value={classId}
                onValueChange={(next) => change({ classId: next })}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div className="grid min-w-0 gap-1 sm:w-48">
              <span className="text-xs font-medium text-slate-600">
                Pickup day
              </span>
              <DateField
                aria-label="Pickup day"
                value={date}
                onChange={(next) => change({ date: next })}
              />
            </div>
            <div className="grid min-w-0 gap-1 sm:w-36">
              <span className="text-xs font-medium text-slate-600">
                Pickup time
              </span>
              <TimeField
                aria-label="Pickup time"
                value={time}
                onChange={(next) => change({ time: next })}
              />
            </div>
            {examples.length > 0 ? (
              <div className="col-span-2 grid sm:block">
                <Menu
                  label="Examples"
                  align="end"
                  trigger={
                    <Button
                      variant="secondary"
                      className="max-sm:w-full"
                      disabled={pending}
                    >
                      Examples
                      <ChevronDownIcon />
                    </Button>
                  }
                >
                  {examples.map((check) => (
                    <MenuItem key={check.name} onSelect={() => example(check)}>
                      <span className="grid">
                        <span>{check.name}</span>
                        {check.note ? (
                          <span className="text-xs text-slate-500">
                            {check.note}
                          </span>
                        ) : null}
                      </span>
                    </MenuItem>
                  ))}
                </Menu>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={cx(
          "grid lg:grid-cols-[minmax(0,1fr)_26rem]",
          full ? "lg:min-h-0 lg:flex-1" : "lg:h-[42rem]",
        )}
      >
        <div className="relative flex flex-col gap-2 p-3 lg:min-h-0">
          {mapKey ? (
            <>
              <div
                ref={mapBox}
                className={cx(
                  "relative shrink-0 lg:h-auto lg:min-h-0 lg:flex-1",
                  full ? "h-[70dvh]" : "h-[50dvh] min-h-72",
                )}
              >
                <TripMap
                  mapKey={mapKey}
                  zones={zones}
                  pins={pins}
                  layers={layers}
                  focus={focus}
                  frame={frame}
                  className="size-full"
                  onPlace={(at) => pin(placing, at)}
                  onMove={pin}
                />
                <div
                  role="radiogroup"
                  aria-label="A click on the map places"
                  className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-md bg-white p-1 text-sm shadow-[0_1px_4px_-1px_rgb(0_0_0/0.3)]"
                >
                  <span className="px-1.5 text-slate-500 max-sm:sr-only">
                    A click places
                  </span>
                  {(["A", "B"] as const).map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      role="radio"
                      aria-checked={placing === letter}
                      onClick={() => setPlacing(letter)}
                      className={cx(
                        "rounded px-2 py-1 font-medium",
                        placing === letter
                          ? "bg-brand text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {letter === "A" ? "Pick-up A" : "Drop-off B"}
                    </button>
                  ))}
                </div>
                <FullScreenButton full={full} onToggle={toggle} />
              </div>
              <Legend />
            </>
          ) : (
            <p className="p-3 text-sm text-slate-600">
              The map needs the browser key,
              NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY. The places and the examples
              still work.
            </p>
          )}
        </div>

        <aside
          aria-live="polite"
          className="grid content-start gap-4 border-slate-200 p-4 max-lg:border-t sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:p-5"
        >
          {pending ? (
            <p className="text-sm text-slate-500">Working out the price…</p>
          ) : answer && !answer.ok ? (
            <FormError error={answer.error} />
          ) : answered ? (
            <>
              <Fare answer={answered} className={className} />
              {answered.customer.length > 0 ? (
                <ul className="grid gap-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {answered.customer.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <div role="tablist" className="flex gap-1">
                  {(
                    [
                      ["calculation", "Calculation"],
                      ["steps", "Steps"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={view === key}
                      onClick={() => setView(key)}
                      className={cx(
                        "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                        view === key
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={copy}>
                  <CopyIcon />
                  {copied ? "Copied" : "Copy breakdown"}
                </Button>
              </div>
              {view === "calculation" ? (
                <ol className="grid gap-1">
                  {lines.map((line, index) => {
                    const canLight = (line.focus?.length ?? 0) > 0;
                    const body = (
                      <>
                        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                          {line.label}
                        </span>
                        <span
                          className={cx(
                            "text-slate-900",
                            line.total
                              ? "text-lg font-semibold tabular-nums"
                              : "text-sm",
                          )}
                        >
                          {line.detail}
                        </span>
                      </>
                    );
                    return (
                      <li key={index}>
                        {canLight ? (
                          <button
                            type="button"
                            aria-pressed={picked === index}
                            onClick={() => pick(index)}
                            onMouseEnter={() => setPointed(index)}
                            onMouseLeave={() => setPointed(null)}
                            onFocus={() => setPointed(index)}
                            onBlur={() => setPointed(null)}
                            className={cx(
                              "grid w-full gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors",
                              lit === index
                                ? "bg-brand-tint ring-1 ring-brand"
                                : "hover:bg-slate-50",
                            )}
                          >
                            {body}
                          </button>
                        ) : (
                          <div className="grid gap-0.5 px-2.5 py-2">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : shownStep ? (
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={step === 0}
                      onClick={() => setStep(step - 1)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={step >= steps.length - 1}
                      onClick={() => setStep(step + 1)}
                    >
                      Next
                    </Button>
                    <span className="text-sm text-slate-500 tabular-nums">
                      {Math.min(step, steps.length - 1) + 1} of {steps.length}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {shownStep.title}
                  </h3>
                  <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
                    <dt className="text-slate-500">We asked Google</dt>
                    <dd className="text-slate-900">
                      {shownStep.asked ?? "No call"}
                    </dd>
                    {shownStep.answered ? (
                      <>
                        <dt className="text-slate-500">Google answered</dt>
                        <dd className="text-slate-900">{shownStep.answered}</dd>
                      </>
                    ) : null}
                    <dt className="text-slate-500">We worked out</dt>
                    <dd className="text-slate-900">{shownStep.workedOut}</dd>
                  </dl>
                </div>
              ) : null}
              <p className="text-xs text-slate-500 tabular-nums">
                {view === "calculation"
                  ? "Pick a line to light up its roads on the map; point at a road, or tap it on a phone, for its distance. "
                  : null}
                Calls made by this try: {calls}, about US$
                {(calls * ROUTE_REQUEST_USD).toFixed(3)} past Google&apos;s free
                allowance. A route asked again within ten minutes is answered
                from memory and not billed.
              </p>
            </>
          ) : (
            <div className="grid gap-2 text-sm text-slate-600">
              <p className="font-medium text-slate-900">
                Pick a pick-up and a drop-off.
              </p>
              <p>
                Search for a place, click the map (A first, then B), or open an
                example. The price is worked out again on every change.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** The fare at the top of the results: the total, the class and the cell, or why there is none. */
function Fare({
  answer,
  className,
}: {
  answer: Extract<TryTripAnswer, { ok: true }>;
  className: string;
}) {
  const quote = answer.quote;
  const price = quote?.price;
  return (
    <div className="grid gap-1 rounded-lg border border-slate-200 p-4">
      <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {className}
        {quote ? ` · ${quote.location}` : ""}
      </span>
      {answer.refused ? (
        <>
          <span className="text-lg font-semibold text-slate-900">
            Not priced
          </span>
          <span className="text-sm text-slate-600">
            {answer.refused.message}
            {answer.refused.reason ? ` Why: ${answer.refused.reason}.` : ""}
          </span>
        </>
      ) : price ? (
        <>
          <span className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatMyr(price.totalSen)}
          </span>
          <dl className="mt-1 grid gap-0.5 text-sm">
            {quote.rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-600">{label}</dt>
                <dd className="whitespace-nowrap text-slate-900 tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <span className="text-lg font-semibold text-slate-900">
            Not on the grid
          </span>
          <span className="text-sm text-slate-600">
            {quote
              ? `${quote.pickup.zone === quote.dropoff.zone ? `Within ${quote.pickup.zone}` : `${quote.pickup.zone} to ${quote.dropoff.zone}`} has no price for this class yet.`
              : "No price."}
          </span>
        </>
      )}
    </div>
  );
}

/** What the map's colours mean: in a corner over it, under it on a phone. */
function Legend() {
  const items: [string, string, string][] = [
    ["Trip, from the zone edges", MAP_COLORS.trip, "solid"],
    ["Extra road", MAP_COLORS.extra, "dashed"],
    ["Grid trip", MAP_COLORS.grid, "dotted"],
    ["Entry spot", MAP_COLORS.entry, "dot"],
    ["Route as Google drew it", MAP_COLORS.route, "solid"],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-slate-700 sm:absolute sm:bottom-8 sm:left-5 sm:z-10 sm:grid sm:gap-1 sm:rounded-md sm:bg-white/95 sm:px-3 sm:py-2 sm:shadow-[0_1px_4px_-1px_rgb(0_0_0/0.3)]">
      {items.map(([label, color, kind]) => (
        <li key={label} className="flex items-center gap-2">
          {kind === "dot" ? (
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          ) : (
            <span
              className="w-5 border-t-[3px]"
              style={{ borderColor: color, borderTopStyle: kind as "solid" }}
            />
          )}
          {label}
        </li>
      ))}
    </ul>
  );
}
