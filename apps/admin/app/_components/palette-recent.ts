"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { MENU_ICONS } from "./menu";
import type { PaletteEntry } from "./palette-index";

/**
 * What the console's search lists before anything is typed: the last rows
 * opened from it, newest first, kept in this browser for each admin
 * (localStorage, keyed by their Clerk id), so an admin goes back to the
 * booking or the page they were on. Nothing is sent to the server. A row
 * kept is what it was when opened; its page checks access as any does.
 */

/** How many rows the search keeps, as many as it lists. */
const RECENT_LIMIT = 5;

/** Said on this page as the rows kept change; another tab hears `storage`. */
const CHANGED = "console-recent";

/** A row opened from the search, as it is kept: an action has the add icon. */
export type RecentEntry = Omit<PaletteEntry, "words"> & { action?: boolean };

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};

/** The stored text, or none where storage is shut (a private window, say). */
function read(key: string | null): string | null {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const isText = (value: unknown) => typeof value === "string";

/** A kept row read back, or none if it is not one: storage can hold anything. */
function entryOf(value: unknown): RecentEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Record<string, unknown>;
  const location = entry.location as Record<string, unknown> | undefined;
  const valid =
    isText(entry.href) &&
    (entry.href as string).startsWith("/") &&
    isText(entry.title) &&
    (entry.meta === undefined || isText(entry.meta)) &&
    (entry.icon === undefined ||
      (isText(entry.icon) &&
        Object.hasOwn(MENU_ICONS, entry.icon as string))) &&
    (location === undefined ||
      (typeof location === "object" &&
        location !== null &&
        isText(location.name) &&
        isText(location.state)));
  return valid ? (entry as RecentEntry) : null;
}

function parse(raw: string | null): RecentEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value
          .map(entryOf)
          .filter((entry) => entry !== null)
          .slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

/** The rows the signed-in admin last opened from the search, and the way to keep one. */
export function useRecent() {
  const { userId } = useAuth();
  const key = userId ? `console-recent:${userId}` : null;
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const recent = useMemo(() => parse(raw), [raw]);

  const remember = useCallback(
    (entry: RecentEntry) => {
      if (!key) return;
      const next = [
        entry,
        ...parse(read(key)).filter((kept) => kept.href !== entry.href),
      ].slice(0, RECENT_LIMIT);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        return;
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [key],
  );

  return { recent, remember };
}
