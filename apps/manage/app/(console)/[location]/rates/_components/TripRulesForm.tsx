"use client";

import {
  CHARGE_LIMITS,
  CROSS_LOCATION_NAME,
  ODD_HOURS_ON,
  TRIP_REACH_FIELDS,
  TRIP_REACH_LIMITS,
  WEEKDAY_NAMES,
  WEEKDAYS_FROM_MONDAY,
  WEEKEND_FIELDS,
  formatDay,
  ringgitInputValue,
  timeOfMinute,
  todayInMalaysia,
  type OddHours,
  type SurchargeCharge,
  type SurchargeKind,
  type TripReach,
  type WeekendSurcharge,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { DateField, TimeField } from "@repo/ui/date-field";
import { Field, FieldGroup } from "@repo/ui/field";
import { FormValue } from "@repo/ui/form-value";
import { XIcon } from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";
import { Switch } from "@repo/ui/switch";
import { useRef, useState, type ReactNode } from "react";
import { ChargeInput } from "../../../../_components/ChargeInput";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { setTripRulesAction } from "./actions";
import { crossLocationNote, extraRoadNote } from "./trip-reach-note";

/** A charge's amount as its field shows it: a whole percentage, or ringgit. */
function amountOf(charge: SurchargeCharge | null) {
  if (!charge) return "";
  return charge.percent !== null
    ? String(charge.percent)
    : ringgitInputValue(charge.flatSen);
}

const kindOf = (charge: SurchargeCharge | null): SurchargeKind =>
  charge && charge.percent === null ? "flat" : "percent";

/** The form's values, compared whole to tell an edit from what is saved. */
function valuesOf(
  reach: TripReach,
  oddHours: OddHours | null,
  weekend: WeekendSurcharge | null,
) {
  return {
    free: String(reach.freeExtraKm),
    max: String(reach.maxExtraKm),
    cross: reach.crossLocation,
    oddOn: oddHours !== null,
    from: oddHours ? timeOfMinute(oddHours.fromMinute) : "",
    to: oddHours ? timeOfMinute(oddHours.toMinute) : "",
    oddKind: kindOf(oddHours),
    oddAmount: amountOf(oddHours),
    weekendOn: weekend !== null,
    days: weekend?.days ?? [],
    dates: weekend?.dates ?? [],
    weekendKind: kindOf(weekend),
    weekendAmount: amountOf(weekend),
  };
}

type Values = ReturnType<typeof valuesOf>;

/** A switch that posts "on" under `name` while it is on, as a checkbox would. */
function PostedSwitch({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <>
      <Switch label={label} checked={checked} onCheckedChange={onChange} />
      {checked ? <input type="hidden" name={name} value="on" /> : null}
    </>
  );
}

/**
 * One rule of the card: its name and what it does on the left, its
 * controls on the right; stacked on a phone. `toggle` sits beside the name.
 */
function Rule({
  title,
  description,
  toggle,
  children,
}: {
  title: string;
  description: ReactNode;
  toggle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="grid gap-3 py-5 first:pt-0 last:pb-0 md:grid-cols-[16rem_1fr] md:gap-8">
      <div className="grid content-start gap-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {toggle}
        </div>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {children ? (
        <div className="grid content-start gap-3">{children}</div>
      ) : null}
    </section>
  );
}

/**
 * The extra road's three bands on one bar: free, charged at the rate per
 * extra km, and past the furthest, sent to WhatsApp. Widths follow the
 * km; the last band is a fixed tail.
 */
function ExtraRoadBar({ free, max }: { free: number; max: number }) {
  const freeShare = max > 0 ? Math.min(1, Math.max(0, free / max)) : 0;
  return (
    <div aria-hidden="true" className="grid gap-1">
      <div className="flex h-7 overflow-hidden rounded-md text-2xs font-medium">
        {freeShare > 0 ? (
          <div
            className="flex items-center justify-center bg-success-tint text-success"
            style={{ width: `${freeShare * 82}%` }}
          >
            Free
          </div>
        ) : null}
        {freeShare < 1 ? (
          <div
            className="flex items-center justify-center bg-brand-tint text-brand"
            style={{ width: `${(1 - freeShare) * 82}%` }}
          >
            Per extra km
          </div>
        ) : null}
        <div className="flex flex-1 items-center justify-center bg-hairline text-muted">
          WhatsApp
        </div>
      </div>
      <div className="relative h-4 text-2xs text-muted tabular-nums">
        <span className="absolute left-0">0 km</span>
        {freeShare > 0 && freeShare < 1 ? (
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${freeShare * 82}%` }}
          >
            {free} km
          </span>
        ) : null}
        <span className="absolute -translate-x-1/2" style={{ left: "82%" }}>
          {max} km
        </span>
      </div>
    </div>
  );
}

/**
 * The days of the week as buttons that stay pressed, Monday first, and
 * the comma-separated list they post. A refusal of the days marks them.
 */
function WeekdayPicker({
  days,
  onChange,
}: {
  days: number[];
  onChange: (days: number[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  return (
    <FieldGroup className="grid gap-1.5">
      <span className="text-sm font-medium text-body">Weekend days</span>
      <div
        ref={box}
        className="flex flex-wrap gap-1.5 rounded-md aria-invalid:ring-2 aria-invalid:ring-danger"
      >
        {WEEKDAYS_FROM_MONDAY.map((day) => {
          const on = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              aria-label={WEEKDAY_NAMES[day]}
              onClick={() =>
                onChange(
                  on ? days.filter((d) => d !== day) : [...days, day].sort(),
                )
              }
              className={cx(
                "h-9 w-12 rounded-md border text-sm font-medium transition-colors focus-ring",
                on
                  ? "border-brand bg-brand text-white"
                  : "border-edge bg-white text-body hover:bg-hover",
              )}
            >
              {WEEKDAY_NAMES[day].slice(0, 3)}
            </button>
          );
        })}
      </div>
      <FormValue
        name={WEEKEND_FIELDS.days}
        value={days.join(",")}
        control={box}
      />
    </FieldGroup>
  );
}

/** The holiday dates: a day picked and added, each listed with a remove button. */
function HolidayPicker({
  dates,
  onChange,
}: {
  dates: string[];
  onChange: (dates: string[]) => void;
}) {
  const [picked, setPicked] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const today = todayInMalaysia();

  function add(day: string) {
    if (day && !dates.includes(day)) onChange([...dates, day].sort());
    setPicked("");
  }

  return (
    <FieldGroup className="grid gap-1.5">
      <span className="text-sm font-medium text-body">Holidays</span>
      <div ref={box} className="flex flex-wrap items-center gap-2">
        <DateField
          aria-label="Add a holiday"
          placeholder="Add a holiday"
          className="w-48"
          value={picked}
          onChange={add}
        />
        {dates.map((date) => (
          <span
            key={date}
            className={cx(
              "inline-flex h-8 items-center gap-1 rounded-full border pr-1 pl-3 text-sm",
              date < today
                ? "border-edge text-muted line-through"
                : "border-edge bg-shade text-body",
            )}
          >
            {formatDay(date)}
            <button
              type="button"
              aria-label={`Remove ${formatDay(date)}`}
              onClick={() => onChange(dates.filter((d) => d !== date))}
              className="grid size-6 place-items-center rounded-full text-muted hover:bg-card-edge hover:text-body focus-ring"
            >
              <XIcon className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <FormValue
        name={WEEKEND_FIELDS.dates}
        value={dates.join(",")}
        control={box}
      />
      <span className="text-xs text-muted">
        Public holidays differ by state: add the ones this location keeps. Past
        ones are struck through; remove them when you like.
      </span>
    </FieldGroup>
  );
}

/**
 * The location's rules on its trips' prices, in one card and one save:
 * the extra road (free up to, served up to), cross-location, the
 * odd-hours surcharge and the weekend and holiday surcharge, each
 * surcharge behind its switch. A refusal shows under its field.
 */
export function TripRulesForm({
  locationId,
  locationName,
  reach,
  oddHours,
  weekend,
}: {
  locationId: string;
  locationName: string;
  reach: TripReach;
  oddHours: OddHours | null;
  weekend: WeekendSurcharge | null;
}) {
  const saved = valuesOf(reach, oddHours, weekend);
  const [v, setV] = useState<Values>(saved);
  const { pending, error, formProps, leaveDialog, markDirty } = useActionForm(
    setTripRulesAction,
    { done: "Trip rules saved.", leave: "The trip rules are not saved." },
  );
  // Switches and day buttons are clicks, not typing: they mark the form too.
  const set = (patch: Partial<Values>) => {
    setV((now) => ({ ...now, ...patch }));
    markDirty();
  };
  const unchanged = JSON.stringify(v) === JSON.stringify(saved);
  const { min, max } = TRIP_REACH_LIMITS.maxExtraKm;
  const freeKm = Number(v.free) || 0;
  const maxKm = Number(v.max) || 0;

  return (
    <form {...formProps} className="grid">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="divide-y divide-hairline">
        <Rule
          title="Extra road"
          description="An address outside every zone is priced from its nearest zone by road, plus its road past the zone's edge."
        >
          <ExtraRoadBar free={freeKm} max={maxKm} />
          <div className="flex flex-wrap gap-4">
            <Field label="Free up to, km">
              <NumberField
                name={TRIP_REACH_FIELDS.freeExtraKm}
                min={0}
                max={maxKm || max}
                step={1}
                value={v.free}
                onChange={(event) => set({ free: event.target.value })}
                className="w-36"
              />
            </Field>
            <Field label="Served up to, km">
              <NumberField
                name={TRIP_REACH_FIELDS.maxExtraKm}
                min={min}
                max={max}
                step={1}
                required
                value={v.max}
                onChange={(event) => set({ max: event.target.value })}
                className="w-36"
              />
            </Field>
          </div>
          <p className="text-xs text-muted">
            {extraRoadNote(freeKm, maxKm)} Each end outside every zone counts on
            its own.
          </p>
        </Rule>

        <Rule
          title={CROSS_LOCATION_NAME}
          description={crossLocationNote(v.cross, locationName)}
          toggle={
            <PostedSwitch
              name={TRIP_REACH_FIELDS.crossLocation}
              label={CROSS_LOCATION_NAME}
              checked={v.cross}
              onChange={(cross) => set({ cross })}
            />
          }
        />

        <Rule
          title="Odd hours"
          description="Added to a trip whose pickup time is in the window, on its price from the grid or by the hour."
          toggle={
            <PostedSwitch
              name={ODD_HOURS_ON}
              label="Odd-hours surcharge"
              checked={v.oddOn}
              onChange={(oddOn) =>
                set(
                  oddOn && v.from === "" && v.to === ""
                    ? { oddOn, from: "23:00", to: "07:00" }
                    : { oddOn },
                )
              }
            />
          }
        >
          {v.oddOn ? (
            <>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 text-sm text-body">
                <span>Pickups from</span>
                <TimeField
                  name="from"
                  aria-label="Window starts at"
                  className="w-36"
                  value={v.from}
                  onChange={(from) => set({ from })}
                />
                <span>to</span>
                <TimeField
                  name="to"
                  aria-label="Window ends at"
                  className="w-36"
                  value={v.to}
                  onChange={(to) => set({ to })}
                />
                <span>cost</span>
                <ChargeInput
                  name="amount"
                  kindName="kind"
                  label="Odd-hours surcharge"
                  kind={v.oddKind}
                  amount={v.oddAmount}
                  onKindChange={(oddKind) => set({ oddKind })}
                  onAmountChange={(oddAmount) => set({ oddAmount })}
                />
                <span>more.</span>
              </div>
              <p className="text-xs text-muted">
                A window that ends before it starts runs past midnight: 11:00 PM
                to 7:00 AM holds 11:30 PM and 6:00 AM.
              </p>
            </>
          ) : null}
        </Rule>

        <Rule
          title="Weekends and holidays"
          description="Added to a trip whose pickup day is a weekend day or a holiday, by the location's local date."
          toggle={
            <PostedSwitch
              name={WEEKEND_FIELDS.on}
              label="Weekend and holiday surcharge"
              checked={v.weekendOn}
              onChange={(weekendOn) =>
                set(
                  weekendOn && v.days.length === 0 && v.dates.length === 0
                    ? { weekendOn, days: [0, 6] }
                    : { weekendOn },
                )
              }
            />
          }
        >
          {v.weekendOn ? (
            <>
              <WeekdayPicker days={v.days} onChange={(days) => set({ days })} />
              <HolidayPicker
                dates={v.dates}
                onChange={(dates) => set({ dates })}
              />
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 text-sm text-body">
                <span>Those days cost</span>
                <ChargeInput
                  name={WEEKEND_FIELDS.amount}
                  kindName={WEEKEND_FIELDS.kind}
                  label="Weekend and holiday surcharge"
                  kind={v.weekendKind}
                  amount={v.weekendAmount}
                  onKindChange={(weekendKind) => set({ weekendKind })}
                  onAmountChange={(weekendAmount) => set({ weekendAmount })}
                />
                <span>more.</span>
              </div>
              <p className="text-xs text-muted">
                {v.weekendKind === "percent"
                  ? `A whole percentage of the trip's price, up to ${CHARGE_LIMITS.maxPercent}%.`
                  : "One amount added to every trip on those days."}{" "}
                With odd hours too, both are added, each on the price before
                either.
              </p>
            </>
          ) : null}
        </Rule>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
        <Button type="submit" disabled={unchanged} pending={pending}>
          {pending ? "Saving…" : "Save rules"}
        </Button>
        <FormError error={error} />
      </div>
      {leaveDialog}
    </form>
  );
}
