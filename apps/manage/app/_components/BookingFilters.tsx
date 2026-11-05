"use client";

import { Button } from "@repo/ui/button";
import { DateField } from "@repo/ui/date-field";
import { XIcon } from "@repo/ui/icons";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DATE_PARAM, DATE_TO_PARAM, withParams } from "../_lib/routes";

/**
 * The pick-up day a list is narrowed to, beside its search, kept in the
 * list's address: a day picked on the calendar narrows the list from its
 * first page, its other filters kept. Given `to`, as the bookings list is,
 * a second field then stretches it to a run of days up to another. The
 * cross clears both. `href` is the list's address as filtered, without a
 * page; a server page cannot hand the fields a function.
 */
export function PickupDateFilter({
  href,
  value,
  to,
  min,
}: {
  href: string;
  /** The day in force, or the first of the run, "2026-10-29"; "" for any. */
  value: string;
  /** The last day of the run, counted in, "" for the one day; left out where a list takes one day only. */
  to?: string;
  /** The first day the calendar offers. */
  min?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const range = to !== undefined;

  function go(from: string, until: string) {
    // A run ending before it starts, or on its first day, is that one day.
    const last = from && until > from ? until : "";
    startTransition(() =>
      router.replace(
        withParams(href, {
          [DATE_PARAM]: from,
          ...(range ? { [DATE_TO_PARAM]: last } : {}),
        }),
        { scroll: false },
      ),
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
      <DateField
        aria-label={range && value ? "Pick-up from" : "Pick-up date"}
        placeholder="Pick-up: any date"
        value={value}
        min={min}
        onChange={(day) => go(day, to ?? "")}
        className={`w-full sm:w-52 ${pending ? "animate-pulse" : ""}`}
      />
      {range && value ? (
        <>
          <span className="text-xs text-muted">to</span>
          <DateField
            aria-label="Pick-up to"
            placeholder="Same day"
            value={to}
            min={value}
            onChange={(day) => go(value, day)}
            className={`w-40 ${pending ? "animate-pulse" : ""}`}
          />
        </>
      ) : null}
      {value ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Any pick-up date"
          onClick={() => go("", "")}
          className="shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
