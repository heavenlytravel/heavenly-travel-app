"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, type CSSProperties } from "react";
import { cx } from "./cx.js";

/** A page that arrives sooner than this shows no line at all. */
const SHOW_AFTER_MS = 400;
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
  const to = new URL(link.href);
  return (
    to.origin === location.origin &&
    (to.pathname !== location.pathname || to.search !== location.search)
  );
}

/**
 * One sign that a page is loading, for an app whose pages are rendered on
 * the server for each request: the page on screen stays until the next one
 * starts to arrive, and this line covers that wait. It listens for clicks
 * on links at the document, so no link has to report anything, and stops
 * when the address changes. A move made by a form is not a link click and
 * shows no line; a form shows its own pending state on its button. The
 * line's looks are in styles.css.
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
      className={cx("ui-nav-progress", className)}
      style={
        { "--ui-progress-from": from, "--ui-progress-to": to } as CSSProperties
      }
    />
  );
}
