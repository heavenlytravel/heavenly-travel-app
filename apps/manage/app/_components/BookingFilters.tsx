"use client";

import { Button } from "@repo/ui/button";
import { DateField } from "@repo/ui/date-field";
import { XIcon } from "@repo/ui/icons";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DATE_PARAM } from "../_lib/routes";

/**
 * The pick-up day a bookings list is narrowed to, beside its search, kept
 * in the list's address: a day picked on the calendar narrows the list
 * from its first page, its other filters kept, and the cross clears it.
 * `href` is the list's address as filtered, without the day or a page; a
 * server page cannot hand the field a function.
 */
export function PickupDateFilter({
  href,
  value,
}: {
  href: string;
  /** The day in force, "2026-10-29"; "" for any. */
  value: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(day: string) {
    const url = new URL(href, window.location.origin);
    if (day) url.searchParams.set(DATE_PARAM, day);
    startTransition(() =>
      router.replace(`${url.pathname}${url.search}`, { scroll: false }),
    );
  }

  return (
    <div className="flex w-full items-center gap-1.5 sm:w-auto">
      <DateField
        aria-label="Pick-up date"
        placeholder="Pick-up: any date"
        value={value}
        onChange={go}
        className={`w-full sm:w-56 ${pending ? "animate-pulse" : ""}`}
      />
      {value ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Any pick-up date"
          onClick={() => go("")}
          className="size-9 shrink-0 px-0 text-muted hover:text-ink"
        >
          <XIcon className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
