"use client";

import { searchTermOf } from "@repo/db";
import { SearchMenu } from "@repo/ui/search-menu";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  BookingMatch,
  BookingSearchResponse,
} from "../_lib/booking-search";
import {
  BOOKING_SEARCH_PATH,
  SEARCH_PARAM,
  bookingsHref,
} from "../_lib/routes";
import { BookingStatusBadge } from "./StatusBadges";

/** How long the typing rests before the search goes out. */
const PAUSE_MS = 200;

/** The last answer, for the text it was asked for; `failed` when the search could not be made. */
type Answer = { term: string; matches: BookingMatch[]; failed: boolean };

/**
 * The search in the console header: a booking by its reference, or by the
 * customer's name, phone or email, across every location whatever the
 * picker is on. The bookings that match list under the box as the admin
 * types, newest first; Enter or a click opens one, inside the location it
 * picks up in. The last row opens the Bookings list with the same search,
 * for more than the box shows. On a phone the box is a button until
 * tapped. See docs/261022-console-scope.md.
 */
export function BookingSearch() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const term = searchTermOf(text);

  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ [SEARCH_PARAM]: term });
      try {
        const response = await fetch(`${BOOKING_SEARCH_PATH}?${params}`, {
          signal: controller.signal,
        });
        const body = response.ok
          ? ((await response.json()) as BookingSearchResponse)
          : null;
        setAnswer({
          term,
          matches: body?.matches ?? [],
          failed: body === null,
        });
      } catch {
        if (!controller.signal.aborted) {
          setAnswer({ term, matches: [], failed: true });
        }
      }
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // While the next answer is on its way the last one stays, so the rows do not flicker.
  const pending = term !== null && answer?.term !== term;
  const matches = useMemo(
    () => (term && answer ? answer.matches : []),
    [term, answer],
  );
  // One list per answer, so the row marked stays put until the rows change.
  const options = useMemo(
    () =>
      term && matches.length > 0
        ? [
            ...matches.map((match) => ({
              key: match.href,
              content: <MatchRow match={match} />,
            })),
            {
              key: bookingsHref({ q: term }),
              content: (
                <span className="block text-slate-600">
                  All bookings matching “{term}”
                </span>
              ),
            },
          ]
        : [],
    [term, matches],
  );
  const status =
    !term || matches.length > 0
      ? null
      : pending
        ? "Searching…"
        : answer?.failed
          ? "The search failed. Try again."
          : `No booking matches “${term}”.`;

  return (
    <SearchMenu
      label="Find a booking"
      placeholder="Find a booking"
      value={text}
      onValueChange={setText}
      options={options}
      status={status}
      pending={pending}
      onChoose={(href) => {
        setText("");
        router.push(href);
      }}
      className="sm:w-full sm:max-w-xs"
    />
  );
}

/** A booking among the matches: its reference and status, where and when, and whose. */
function MatchRow({ match }: { match: BookingMatch }) {
  return (
    <span className="grid gap-0.5">
      <span className="flex min-w-0 items-center gap-2">
        <span className="font-medium text-slate-900 tabular-nums">
          {match.reference}
        </span>
        <BookingStatusBadge status={match.status} />
        <span className="ml-auto truncate text-xs text-slate-500">
          {match.locations}
        </span>
      </span>
      <span className="truncate text-xs text-slate-500">
        {match.customer} · {match.pickup}
      </span>
    </span>
  );
}
