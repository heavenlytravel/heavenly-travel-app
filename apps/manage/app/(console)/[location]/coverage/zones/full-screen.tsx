"use client";

import { MaximizeIcon, MinimizeIcon } from "@repo/ui/icons";
import { Tooltip } from "@repo/ui/tooltip";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => undefined;

/**
 * A part of the page that can go full screen by the browser's own full
 * screen, with what is around its map: `ref` goes on it, `full` says
 * whether it is, `toggle` takes it in or out. The browser's Esc leaves it
 * too.
 */
export function useFullScreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const follow = () =>
      setFull(
        ref.current !== null && document.fullscreenElement === ref.current,
      );
    document.addEventListener("fullscreenchange", follow);
    return () => document.removeEventListener("fullscreenchange", follow);
  }, []);
  function toggle() {
    // A browser that refuses leaves the page as it is.
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      ref.current?.requestFullscreen().catch(() => undefined);
    }
  }
  return { ref, full, toggle };
}

/**
 * The full-screen button, top right over a map. None where the browser
 * cannot put a part of the page in full screen, as on an iPhone; none on
 * the server, so the markup matches.
 */
export function FullScreenButton({
  full,
  onToggle,
}: {
  full: boolean;
  onToggle: () => void;
}) {
  const enabled = useSyncExternalStore(
    noSubscribe,
    () => document.fullscreenEnabled,
    () => false,
  );
  if (!enabled) return null;
  const label = full ? "Exit full screen" : "Full screen";
  return (
    <Tooltip
      content={label}
      side="left"
      className="absolute top-2.5 right-2.5 z-(--layer-raised)"
    >
      <button
        type="button"
        aria-label={label}
        onClick={onToggle}
        className="grid size-10 place-items-center rounded-sm bg-white text-muted shadow-map hover:text-ink focus-ring [&_svg]:size-4.5"
      >
        {full ? <MinimizeIcon /> : <MaximizeIcon />}
      </button>
    </Tooltip>
  );
}
