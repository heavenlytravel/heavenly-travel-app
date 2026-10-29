"use client";

import { haptic } from "@repo/ui/haptic";
import { cx } from "@repo/ui/cx";
import { Check, ChevronsRight } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

/** The knob's size and the track's inset, in pixels. */
const KNOB = 56;
const INSET = 4;
/** How far along a release counts as a yes. */
const THRESHOLD = 0.85;

/**
 * A trip report a driver slides to send, as ride apps have it, so a phone
 * in a pocket or a thumb brushing the screen sends nothing: drag the knob
 * to the end. A keyboard sends it with Enter or Space on the knob.
 */
export function SlideToConfirm({
  label,
  hint,
  onConfirm,
}: {
  label: string;
  hint?: string;
  onConfirm: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  /** Where the pointer took the knob, while it holds it. */
  const [grab, setGrab] = useState<number | null>(null);
  /** How far the knob can travel, measured as it is taken. */
  const [span, setSpan] = useState(0);
  const [x, setX] = useState(0);
  const [sent, setSent] = useState(false);

  const max = () =>
    Math.max(0, (track.current?.clientWidth ?? 0) - KNOB - INSET * 2);

  function confirm() {
    setSent(true);
    setX(max());
    haptic();
    onConfirm();
    setTimeout(() => {
      setSent(false);
      setX(0);
    }, 900);
  }

  function down(event: PointerEvent<HTMLButtonElement>) {
    if (sent) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSpan(max());
    setGrab(event.clientX - x);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (grab === null) return;
    setX(Math.min(span, Math.max(0, event.clientX - grab)));
  }

  function up() {
    if (grab === null) return;
    setGrab(null);
    if (span > 0 && x >= span * THRESHOLD) confirm();
    else setX(0);
  }

  const progress = span > 0 ? x / span : 0;
  const dragging = grab !== null;

  return (
    <div className="grid gap-2">
      <div
        ref={track}
        className={cx(
          "relative h-16 overflow-hidden rounded-[1.25rem] shadow-[0_12px_28px_-10px_rgba(4,107,210,0.75)] select-none",
          sent ? "bg-emerald-600" : "bg-brand",
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-brand-strong"
          style={{
            width: x + KNOB + INSET * 2,
            transition: dragging ? "none" : "width 0.25s ease-out",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center pl-14 text-base font-bold text-white"
          style={{ opacity: sent ? 1 : 1 - progress * 1.4 }}
        >
          {sent ? "Sent" : label}
          {sent ? null : (
            <ChevronsRight className="ml-1 size-5 animate-pulse opacity-70" />
          )}
        </span>
        <button
          type="button"
          aria-label={label}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          // A pointer's tap does nothing; the keyboard's click sends.
          onClick={(event) => {
            if (event.detail === 0 && !sent) confirm();
          }}
          className="absolute top-1 left-1 grid size-14 cursor-grab touch-none place-items-center rounded-2xl bg-white text-brand shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:cursor-grabbing"
          style={{
            transform: `translateX(${x}px)`,
            transition: dragging ? "none" : "transform 0.25s ease-out",
          }}
        >
          {sent ? (
            <Check
              aria-hidden
              className="size-6 text-emerald-600"
              strokeWidth={3}
            />
          ) : (
            <ChevronsRight aria-hidden className="size-6" strokeWidth={2.5} />
          )}
        </button>
      </div>
      {hint ? (
        <p className="text-center text-xs font-medium text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
