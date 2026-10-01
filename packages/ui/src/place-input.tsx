"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PlaceSuggestion } from "@repo/places";
import { cx } from "./cx.js";
import { fetchPlaceSuggestions, isSearchableQuery } from "./place-search.js";

const DEBOUNCE_MS = 250;

/**
 * A text input with a suggestion list underneath, fed by the app's
 * /api/places/search. Picking a row reports the label and the place id;
 * typing reports the text alone, so the caller knows whether the place is
 * resolved. One Google autocomplete session token lives from the first
 * keystroke to a pick, then a new one is minted, which is how Google bills
 * a session as one request. The input is unstyled: the caller passes the
 * classes its form uses. `includeAreas` also offers towns and other areas,
 * for the admin's location search.
 */
export function PlaceInput({
  id,
  value,
  placeId,
  placeholder,
  includeAreas = false,
  onChange,
  onFocus,
  className,
}: {
  id: string;
  value: string;
  placeId?: string;
  placeholder?: string;
  includeAreas?: boolean;
  onChange: (value: string, placeId?: string) => void;
  onFocus?: () => void;
  className?: string;
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const session = useRef<string>(undefined);
  const root = useRef<HTMLDivElement>(null);

  const sessionToken = () => (session.current ??= crypto.randomUUID());

  // A resolved value (one with a place id) is what was just picked, and a
  // short one is not worth asking about: neither fetches nor shows a list.
  const searchable = !placeId && isSearchableQuery(value);

  // Fetch while typing, debounced and cancellable.
  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchPlaceSuggestions(
        value,
        sessionToken(),
        controller.signal,
        includeAreas,
      )
        .then((rows) => {
          setSuggestions(rows);
          setActive(-1);
        })
        .catch(() => {
          // Aborted by a newer keystroke, or the network failed: keep quiet.
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, searchable, includeAreas]);

  function pick(s: PlaceSuggestion) {
    onChange(s.label, s.placeId);
    setSuggestions([]);
    setOpen(false);
    session.current = undefined;
  }

  const showing = open && searchable && suggestions.length > 0;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const chosen = suggestions[active];
      if (chosen) pick(chosen);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={root}
      className="ui:relative"
      // Closing on blur has to wait for a click on a row to land first.
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <input
        id={id}
        className={className}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showing && active >= 0 ? `${listId}-${active}` : undefined
        }
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          onFocus?.();
        }}
        onKeyDown={onKeyDown}
      />
      {showing && (
        <ul
          id={listId}
          role="listbox"
          className="ui:absolute ui:top-full ui:left-0 ui:z-20 ui:mt-2 ui:max-h-72 ui:w-max ui:max-w-[min(90vw,26rem)] ui:min-w-full ui:overflow-auto ui:rounded-xl ui:border ui:border-[#dce3e0] ui:bg-white ui:py-1.5 ui:text-left ui:text-[#102825] ui:shadow-[0_18px_40px_rgba(9,43,39,0.18)]"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              onMouseEnter={() => setActive(i)}
              className={cx(
                "ui:cursor-pointer ui:px-3.5 ui:py-2",
                i === active && "ui:bg-[#e8f2ef]",
              )}
            >
              <span className="ui:block ui:text-[0.95rem] ui:font-semibold ui:text-[#082f2b]">
                {s.label}
              </span>
              {s.detail && (
                <span className="ui:block ui:text-[0.8rem] ui:text-[#64706d]">
                  {s.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
