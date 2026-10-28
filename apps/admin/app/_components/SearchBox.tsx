"use client";

import { SEARCH_MAX_LENGTH } from "@repo/db";
import { inputClassName } from "@repo/ui/field";
import { SearchIcon } from "@repo/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SEARCH_PARAM } from "../_lib/routes";

/** How long the typing rests before the list narrows. */
const PAUSE_MS = 300;

/**
 * The search over a list, kept in the list's address so a reload and a
 * shared link keep it: what is typed narrows the list a moment after the
 * typing stops, from its first page, its other filters kept. Escape
 * clears it. `href` is the list's address as filtered, without the search
 * or a page; a server page cannot hand the box a function.
 */
export function SearchBox({
  href,
  value,
  label,
  placeholder,
  fill = false,
}: {
  href: string;
  /** The search in force; "" for none. */
  value: string;
  /** What the box searches, for screen readers: "Search bookings". */
  label: string;
  /** What it finds, while empty: "Reference, name, phone or email". */
  placeholder: string;
  /** Fills its parent at every width, for a bar that sizes it; otherwise 18rem from `sm`. */
  fill?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(value);
  // A search changed elsewhere, by a link or the back button, shows here;
  // the one this box just made is what is typed already.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    if (value !== text.trim()) setText(value);
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function search(next: string) {
    const url = new URL(href, window.location.origin);
    const term = next.trim();
    if (term) url.searchParams.set(SEARCH_PARAM, term);
    startTransition(() =>
      router.replace(`${url.pathname}${url.search}`, { scroll: false }),
    );
  }

  function change(next: string, now = false) {
    setText(next);
    clearTimeout(timer.current);
    if (now) search(next);
    else timer.current = setTimeout(() => search(next), PAUSE_MS);
  }

  return (
    <div
      role="search"
      className={fill ? "relative w-full" : "relative w-full sm:w-72"}
    >
      <SearchIcon
        className={`pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 ${
          pending ? "animate-pulse text-slate-700" : "text-slate-400"
        }`}
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        maxLength={SEARCH_MAX_LENGTH}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && text) {
            event.preventDefault();
            change("", true);
          }
        }}
        className={`${inputClassName} pl-9`}
      />
    </div>
  );
}
