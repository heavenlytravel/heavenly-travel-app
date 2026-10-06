"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** A page that arrives sooner than this shows no line at all. */
const SHOW_AFTER_MS = 400;
/** A page that never arrives must not leave the line running. */
const GIVE_UP_AFTER_MS = 20_000;

type Phase = "idle" | "running" | "done";

/**
 * Whether the click opens another page of the console in this tab: a plain
 * left click on a link to somewhere other than where we are. A new tab, a
 * download, another site and a jump within the page are not.
 */
function leavesPage(event: MouseEvent) {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (!(event.target instanceof Element)) return false;
  const link = event.target.closest("a");
  if (!link?.href || link.hasAttribute("download")) return false;
  if (link.target && link.target !== "_self") return false;
  const to = new URL(link.href);
  return (
    to.origin === location.origin &&
    (to.pathname !== location.pathname || to.search !== location.search)
  );
}

/**
 * The console's one sign that a page is loading. A page is rendered on the
 * server for each request, and the page on screen stays until the next one
 * starts to arrive; this line covers that wait. It listens for clicks on
 * links, so no link has to report anything, and stops when the address
 * changes. The line's looks are in globals.css.
 */
export function NavigationProgress() {
  const line = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const here = `${usePathname()}?${useSearchParams()}`;

  useEffect(() => {
    const set = (phase: Phase) => {
      if (line.current) line.current.dataset.phase = phase;
    };
    const stop = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    function onClick(event: MouseEvent) {
      if (!leavesPage(event)) return;
      stop();
      set("idle");
      timers.current = [
        setTimeout(() => set("running"), SHOW_AFTER_MS),
        setTimeout(() => set("idle"), GIVE_UP_AFTER_MS),
      ];
    }
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      stop();
    };
  }, []);

  // The address changed: the next page has started to arrive.
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (line.current?.dataset.phase === "running") {
      line.current.dataset.phase = "done";
    }
  }, [here]);

  return (
    <div
      ref={line}
      data-phase="idle"
      aria-hidden="true"
      className="nav-progress"
    />
  );
}
