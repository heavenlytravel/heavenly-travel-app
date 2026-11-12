"use client";

import {
  formatLocalTime,
  nextTripStep,
  noShowRefusal,
  noShowUndoRefusal,
  NO_SHOW_UNDO_MINUTES,
  noShowEndsAt,
  TRIP_EVENT_LABELS,
  TRIP_EVENT_NOTE_MAX_LENGTH,
  type TripEventKind,
} from "@repo/db";
import type { TripEventView } from "@repo/db/server";
import { Input, Textarea } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FormError } from "@repo/ui/form-error";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/notice";
import { CloudOff, PenLine, Undo2, UserX } from "lucide-react";
import {
  reportTapAction,
  undoNoShowAction,
  type TapPayload,
} from "../../../actions";
import { SlideToConfirm } from "../../../_ui/SlideToConfirm";
import { TripTimeline, type TimelineEvent } from "../../../_ui/TripTimeline";

/** Where the phone keeps the taps not sent yet, across reloads and lost signal. */
const QUEUE_KEY = "connect.pending-taps";

function readQueue(): TapPayload[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(value) ? (value as TapPayload[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: readonly TapPayload[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** What each step's slider says, and the line under it. */
const STEP_PROMPTS: Partial<
  Record<TripEventKind, { label: string; hint: string }>
> = {
  arrived: {
    label: "I've arrived",
    hint: "Slide when you are at the pick-up.",
  },
  "dropped-off": {
    label: "Dropped off",
    hint: "Slide at the drop-off. This ends the trip.",
  },
};

/**
 * The driver's trip on the day, two reports: Arrived, then Dropped off,
 * each one slider, so a pocket or a brushing thumb sends nothing. A note
 * goes with the next report. No-show stands apart below, once the driver
 * has arrived and the pickup time has passed (`noShowRefusal`), in red. It
 * asks why, then asks once more before it is sent; for `NO_SHOW_UNDO_MINUTES` after, the driver can
 * take it back when the passenger turns up. A tap is kept on the phone first, with an id made
 * here, then sent; without signal it waits and is sent again on the next
 * load or when the phone is back online. The server keeps a tap once,
 * however often it is sent.
 */
export function TripTaps({
  itemId,
  startsAt,
  events,
  open,
  cancelled,
}: {
  itemId: string;
  /** The pickup: a no-show is reported once it has passed. */
  startsAt: Date;
  events: TripEventView[];
  /** The trip can still be reported: accepted, not done, not cancelled. */
  open: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [waiting, setWaiting] = useState<TapPayload[]>([]);
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState(false);
  // The no-show's reason while it is written; null while it is not.
  const [noShow, setNoShow] = useState<string | null>(null);
  // The reason is written: asked once more before it is sent.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoing, startUndo] = useTransition();
  // The time a no-show waits for, read again each half minute.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  /** Sends every tap waiting on the phone, oldest first; keeps those that do not arrive. */
  const flush = useCallback(async () => {
    const left: TapPayload[] = [];
    let sent = false;
    for (const tap of readQueue()) {
      try {
        const answer = await reportTapAction(tap);
        if (answer.ok) sent = true;
        else setError(answer.error);
      } catch {
        // No signal: it waits for the next try.
        left.push(tap);
      }
    }
    writeQueue(left);
    setWaiting(left.filter((tap) => tap.itemId === itemId));
    if (sent) router.refresh();
  }, [itemId, router]);

  useEffect(() => {
    const send = () => void flush();
    // On load, after the page has painted: a queue left from a lost signal.
    const first = setTimeout(send, 0);
    window.addEventListener("online", send);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", send);
    };
  }, [flush]);

  function tap(kind: TripEventKind, text: string) {
    setError(null);
    const payload: TapPayload = {
      itemId,
      kind,
      at: new Date().toISOString(),
      note: text.trim() || null,
      clientId: crypto.randomUUID(),
    };
    writeQueue([...readQueue(), payload]);
    setWaiting((current) => [...current, payload]);
    setNote("");
    setNoting(false);
    setNoShow(null);
    setConfirming(false);
    toast.success(
      `${TRIP_EVENT_LABELS[kind]}, ${formatLocalTime(new Date(payload.at))}.`,
    );
    void flush();
  }

  function undo() {
    setError(null);
    startUndo(async () => {
      const answer = await undoNoShowAction(itemId).catch(() => ({
        ok: false as const,
        error: "No signal. Try again, or call Operation.",
      }));
      if (!answer.ok) {
        setError(answer.error);
        return;
      }
      toast.success("No-show taken back. Report Dropped off at the end.");
      router.refresh();
    });
  }

  /** The reason checked, then asked once more. */
  function askNoShow() {
    if (!noShow?.trim()) {
      setError("Say why: how long you waited and how you tried to reach them.");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  const shown: TimelineEvent[] = [
    ...events.map((e) => ({
      key: e.id,
      kind: e.kind,
      at: e.at,
      note: e.note,
      sent: true,
    })),
    ...waiting.map((t) => ({
      key: t.clientId,
      kind: t.kind,
      at: new Date(t.at),
      note: t.note,
      sent: false,
    })),
  ];
  const next = nextTripStep(shown);
  const prompt = next ? STEP_PROMPTS[next] : undefined;
  const canNoShow =
    open && next !== null && noShowRefusal(shown, startsAt, now) === null;
  // Only once the no-show is sent: one still waiting for signal is not kept yet.
  const canUndo =
    !cancelled &&
    !waiting.some((t) => t.kind === "no-show") &&
    noShowUndoRefusal(events, now) === null;

  return (
    <div className="grid gap-6">
      <TripTimeline events={shown} next={open ? next : null} />
      {waiting.length > 0 ? (
        <Notice className="flex items-center gap-2 px-4 py-3 font-medium">
          <CloudOff aria-hidden className="size-4 shrink-0" />
          {waiting.length === 1
            ? "1 report is waiting for signal."
            : `${waiting.length} reports are waiting for signal.`}{" "}
          They send by themselves.
        </Notice>
      ) : null}
      {open && next && prompt ? (
        <div className="grid gap-3">
          <SlideToConfirm
            key={next}
            label={prompt.label}
            hint={prompt.hint}
            onConfirm={() => tap(next, note)}
          />
          {noting ? (
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-body">
                Note, sent with your next report
              </span>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
                autoComplete="off"
                autoFocus
                placeholder="The customer came at 08:15"
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setNoting(true)}
              className="mx-auto flex items-center gap-1.5 rounded-sm py-1.5 text-sm text-link"
            >
              <PenLine aria-hidden className="size-4" />
              Add a note
            </button>
          )}
        </div>
      ) : null}
      {canNoShow ? (
        noShow === null ? (
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              setError(null);
              setNoShow("");
            }}
          >
            <UserX aria-hidden className="size-5" />
            No-show
          </Button>
        ) : (
          <div className="grid gap-3 rounded-card border border-danger-edge bg-danger-tint p-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-danger-strong">
                Why is it a no-show?
              </span>
              <span className="text-sm text-body">
                This ends the trip. Call or WhatsApp the passenger first, and
                wait as Operation asks.
              </span>
              <Textarea
                value={noShow}
                onChange={(event) => setNoShow(event.target.value)}
                readOnly={confirming}
                maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
                rows={3}
                autoFocus
                placeholder="Waited 45 minutes at arrivals, called twice, no answer"
              />
            </label>
            {confirming ? (
              <p className="text-sm font-semibold text-danger-strong">
                Report a no-show now? The trip ends {NO_SHOW_UNDO_MINUTES}{" "}
                minutes after. Until then you can take it back if the passenger
                comes.
              </p>
            ) : null}
            <div className="grid grid-cols-[1fr_1.4fr] gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setError(null);
                  if (confirming) setConfirming(false);
                  else setNoShow(null);
                }}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() =>
                  confirming ? tap("no-show", noShow) : askNoShow()
                }
              >
                {confirming ? "Yes, report no-show" : "Report no-show"}
              </Button>
            </div>
          </div>
        )
      ) : null}
      {canUndo ? (
        <div className="grid gap-1.5">
          <Button
            variant="secondary"
            size="lg"
            pending={undoing}
            onClick={undo}
          >
            <Undo2 aria-hidden className="size-5" />
            The passenger came: undo no-show
          </Button>
          <p className="text-center text-caption text-muted">
            You can take it back until{" "}
            {formatLocalTime(noShowEndsAt(events) ?? now)}. Then the trip ends.
          </p>
        </div>
      ) : null}
      <FormError error={error} />
    </div>
  );
}
