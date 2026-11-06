"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, type CSSProperties } from "react";
import { cx } from "./cx.js";

/** A page that never arrives must not leave the line running. */
const GIVE_UP_AFTER_MS = 20_000;

type Phase = "idle" | "running" | "done";

type Props = {
  /** Where the line sits: the caller positions it, say `fixed inset-x-0 top-0`. */
  className?: string;
  /** The line's colours, left to right. */
  gradient: [from: string, to: string];
};

/**
 * Whether the click opens another page of the app in this tab: a plain
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
  return leavesFor(link.href);
}

/** Whether an address is another page of the app than the one on screen. */
function leavesFor(href: string) {
  const to = new URL(href, location.href);
  return (
    to.origin === location.origin &&
    (to.pathname !== location.pathname || to.search !== location.search)
  );
}

/** The event a move made in code sends the line. */
const NAVIGATE_EVENT = "ui:navigate";

/**
 * Starts the line for a move made in code, `router.push(href)` from a row's
 * click or a select, which the line cannot see as a link click. Call it
 * with the same address, just before the push; one to the page on screen
 * starts nothing, as no new page would stop it.
 */
export function showNavigation(href: string) {
  if (leavesFor(href)) window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/**
 * One sign that a page is loading, for an app whose pages are rendered on
 * the server for each request: the page on screen stays until the next one
 * starts to arrive, and this line covers that wait, from the click on, so
 * the click shows at once however long the page takes. It listens for
 * clicks on links at the document, so no link has to report anything, and
 * stops when the address changes. A move made by a form is not a link
 * click and shows no line; a form shows its own pending state on its
 * button, and a move made in code calls `showNavigation`. The line's looks
 * are in styles.css.
 */
export function NavigationProgress(props: Props) {
  // It reads the search params, which suspends a page that is prerendered.
  return (
    <Suspense>
      <Line {...props} />
    </Suspense>
  );
}

function Line({ className, gradient: [from, to] }: Props) {
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
    function start() {
      stop();
      // At once, in the click's own frame: a click that changes nothing on
      // screen until the next page arrives reads as a page that froze. From
      // nothing, so a line still finishing the last page does not run back.
      set("idle");
      void line.current?.offsetWidth;
      set("running");
      timers.current = [setTimeout(() => set("idle"), GIVE_UP_AFTER_MS)];
    }
    function onClick(event: MouseEvent) {
      if (leavesPage(event)) start();
    }
    document.addEventListener("click", onClick);
    window.addEventListener(NAVIGATE_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(NAVIGATE_EVENT, start);
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
      className={cx("ui-nav-progress", className)}
      style={
        { "--ui-progress-from": from, "--ui-progress-to": to } as CSSProperties
      }
    />
  );
}
