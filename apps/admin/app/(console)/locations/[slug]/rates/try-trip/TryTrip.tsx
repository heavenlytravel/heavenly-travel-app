"use client";

import type { LngLat, PriceCheck, PriceCheckEnd, ZoneShape } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { TimeField } from "@repo/ui/date-field";
import { inputClassName } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import { useId, useState, useTransition } from "react";
import { FormError } from "../../../../../_components/FormError";
import { tryTripAction, type TryEnd, type TryTripAnswer } from "./actions";
import { allLayers, explainCalculation, explainSteps } from "./explain";
import { TripMap, type TripPin } from "./TripMap";

/** What Google bills a route request past the free allowance, in US dollars. */
const ROUTE_REQUEST_USD = 0.005;

/** An end as the card holds it: the text in its field, and the place or the pin it stands for. */
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

/**
 * Try a trip: a pickup and a drop-off, each a place from the search or a
 * pin on the map, a class and a pickup time, priced by the website's own
 * quote with the pickup kept to this location. The answer shows as the
 * calculation, set out line by line, or step by step, each step with the
 * call it made to Google, what came back and what was worked out, the map
 * redrawn for it. Every try makes real calls; their count and cost are
 * under the steps. The examples are the live check's named trips. Nothing
 * is booked or saved.
 */
export function TryTrip({
  locationId,
  mapKey,
  zones,
  classes,
  examples,
}: {
  locationId: string;
  /** The browser key for Google's map; null when it is not set. */
  mapKey: string | null;
  zones: { id: string; name: string; shape: ZoneShape }[];
  /** The classes on sale here: the ones a trip can be priced for. */
  classes: { id: string; name: string; slug: string }[];
  examples: PriceCheck[];
}) {
  const ids = useId();
  const [pickup, setPickup] = useState<EndState>(EMPTY);
  const [dropoff, setDropoff] = useState<EndState>(EMPTY);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [time, setTime] = useState("10:00");
  /** Which end a click on the map places. */
  const [placing, setPlacing] = useState<"A" | "B">("A");
  const [answer, setAnswer] = useState<TryTripAnswer | null>(null);
  const [view, setView] = useState<"calculation" | "steps">("calculation");
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  if (classes.length === 0) {
    return (
      <p className="border-t border-slate-200 px-6 py-5 text-sm text-slate-600">
        Put a class on sale to try a trip in it.
      </p>
    );
  }

  function run(next: {
    pickup: EndState;
    dropoff: EndState;
    classId: string;
    time: string;
  }) {
    if (!next.pickup.end || !next.dropoff.end || !next.classId) return;
    const input = {
      pickup: next.pickup.end,
      dropoff: next.dropoff.end,
      vehicleClassId: next.classId,
      time: next.time,
    };
    startTransition(async () => {
      const answered = await answerOf(tryTripAction(locationId, input));
      setAnswer(
        "ok" in answered ? answered : { ok: false, error: answered.error },
      );
      setStep(0);
    });
  }

  const current = { pickup, dropoff, classId, time };
  function change(patch: Partial<typeof current>) {
    const next = { ...current, ...patch };
    if (patch.pickup) setPickup(patch.pickup);
    if (patch.dropoff) setDropoff(patch.dropoff);
    if (patch.classId !== undefined) setClassId(patch.classId);
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
  const layers = answered
    ? view === "steps" && shownStep
      ? shownStep.layers
      : allLayers(answered)
    : [];
  const pinAt = (state: EndState, fromAnswer: LngLat | undefined) =>
    state.end && "lat" in state.end
      ? ([state.end.lng, state.end.lat] as LngLat)
      : fromAnswer;
  const pins: TripPin[] = [
    { letter: "A" as const, at: pinAt(pickup, answered?.pickup.at) },
    { letter: "B" as const, at: pinAt(dropoff, answered?.dropoff.at) },
  ].flatMap((p) => (p.at ? [{ letter: p.letter, at: p.at }] : []));
  const calls = answered?.trace.calls ?? 0;

  return (
    <div className="grid gap-5 border-t border-slate-200 px-6 py-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_12rem_9rem]">
        {(
          [
            [
              "A",
              "Pick-up",
              pickup,
              (end: EndState) => change({ pickup: end }),
            ],
            [
              "B",
              "Drop-off",
              dropoff,
              (end: EndState) => change({ dropoff: end }),
            ],
          ] as const
        ).map(([letter, label, state, set]) => (
          <div key={letter} className="grid gap-1.5">
            <label
              htmlFor={`${ids}-${letter}`}
              className="text-sm font-medium text-slate-800"
            >
              {label} ({letter})
            </label>
            <PlaceInput
              id={`${ids}-${letter}`}
              value={state.text}
              placeId={
                state.end && "placeId" in state.end
                  ? state.end.placeId
                  : undefined
              }
              placeholder="A place, or a click on the map"
              className={inputClassName}
              onChange={(text, placeId) =>
                placeId
                  ? set({ text, end: { placeId, label: text } })
                  : letter === "A"
                    ? setPickup({ text, end: null })
                    : setDropoff({ text, end: null })
              }
            />
          </div>
        ))}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-800">Class</span>
          <Select
            aria-label="Class"
            value={classId}
            onValueChange={(next) => change({ classId: next })}
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-800">
            Pickup time
          </span>
          <TimeField
            aria-label="Pickup time"
            value={time}
            onChange={(next) => change({ time: next })}
          />
        </div>
      </div>

      {examples.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Examples:</span>
          {examples.map((check) => (
            <Button
              key={check.name}
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => example(check)}
              title={check.note}
            >
              {check.name}
            </Button>
          ))}
        </div>
      ) : null}

      {mapKey ? (
        <div className="grid gap-2">
          <div
            role="radiogroup"
            aria-label="A click on the map places"
            className="flex flex-wrap items-center gap-2 text-sm text-slate-600"
          >
            A click on the map places the
            {(["A", "B"] as const).map((letter) => (
              <button
                key={letter}
                type="button"
                role="radio"
                aria-checked={placing === letter}
                onClick={() => setPlacing(letter)}
                className={cx(
                  "rounded-md border px-2.5 py-1 font-medium",
                  placing === letter
                    ? "border-brand bg-brand-tint text-slate-900"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                {letter === "A" ? "pick-up (A)" : "drop-off (B)"}
              </button>
            ))}
            <span>; drag a pin to move it.</span>
          </div>
          <TripMap
            mapKey={mapKey}
            zones={zones}
            pins={pins}
            layers={layers}
            onPlace={(at) => pin(placing, at)}
            onMove={pin}
          />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Dark: the trip, from the zone edges</span>
            <span>Orange dashes: the extra road</span>
            <span>Green dots: the grid trip</span>
            <span>Purple: an entry spot</span>
            <span>Grey: a route as Google drew it</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          The map needs the browser key, NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY.
          The places and the examples still work.
        </p>
      )}

      {pending ? (
        <p aria-live="polite" className="text-sm text-slate-500">
          Working out the price…
        </p>
      ) : answer && !answer.ok ? (
        <FormError error={answer.error} />
      ) : answered ? (
        <div className="grid gap-4">
          <div role="tablist" className="flex gap-2">
            {(
              [
                ["calculation", "The calculation"],
                ["steps", "Step by step"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cx(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  view === key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {view === "calculation" ? (
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
              {explainCalculation(answered).map((line, index) => (
                <div key={index} className="contents">
                  <dt className="text-slate-500">{line.label}</dt>
                  <dd className="text-slate-900">{line.detail}</dd>
                </div>
              ))}
            </dl>
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
                  Step {Math.min(step, steps.length - 1) + 1} of {steps.length}:{" "}
                  {shownStep.title}
                </span>
              </div>
              <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
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
            Calls made by this try: {calls}, about US$
            {(calls * ROUTE_REQUEST_USD).toFixed(3)} past Google&apos;s free
            allowance. A route asked again within ten minutes is answered from
            memory and not billed.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Pick a pickup and a drop-off, or an example, to price a trip.
        </p>
      )}
    </div>
  );
}
