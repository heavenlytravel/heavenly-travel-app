"use client";

import {
  formatLocalTime,
  nextTripStep,
  TRIP_EVENT_LABELS,
  TRIP_EVENT_NOTE_MAX_LENGTH,
  type TripEventKind,
} from "@repo/db";
import type { TripEventView } from "@repo/db/server";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Input, Textarea } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FormError } from "@repo/ui/form-error";
import { Button } from "@repo/ui/button";
import { TriangleAlertIcon } from "@repo/ui/icons";
import { Notice } from "@repo/ui/notice";
import { CloudOff, PenLine, UserX } from "lucide-react";
import { reportTapAction, type TapPayload } from "../../actions";
import { SlideToConfirm } from "../../_ui/SlideToConfirm";
import { TripTimeline, type TimelineEvent } from "../../_ui/TripTimeline";

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
  "on-the-way": {
    label: "I'm on my way",
    hint: "Slide when you leave for the pick-up.",
  },
  arrived: {
    label: "I've arrived",
    hint: "Slide when you are at the pick-up. Waiting time counts from here.",
  },
  "on-board": {
    label: "Passenger on board",
    hint: "Slide once everyone is in.",
  },
  "dropped-off": {
    label: "Dropped off",
    hint: "Slide at the drop-off. This ends the trip.",
  },
};

/**
 * The driver's trip on the day: the steps so far, then one slider for the
 * next, so a pocket or a brushing thumb sends nothing. A note goes with
 * the next report; No-show (after a yes) and a problem (with what it is)
 * stand apart below. A tap is kept on the phone first, with an id made
 * here, then sent; without signal it waits and is sent again on the next
 * load or when the phone is back online. The server keeps a tap once,
 * however often it is sent.
 */
export function TripTaps({
  itemId,
  events,
  open,
}: {
  itemId: string;
  events: TripEventView[];
  /** The trip can still be reported: accepted, not done, not cancelled. */
  open: boolean;
}) {
  const router = useRouter();
  const [dialog, confirm] = useConfirm();
  const [waiting, setWaiting] = useState<TapPayload[]>([]);
  const [note, setNote] = useState("");
  const [noting, setNoting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setProblem(null);
    toast.success(
      `${TRIP_EVENT_LABELS[kind]}, ${formatLocalTime(new Date(payload.at))}.`,
    );
    void flush();
  }

  async function noShow() {
    const yes = await confirm({
      title: "Report a no-show?",
      description:
        "This ends the trip. Call or WhatsApp the passenger first, and wait as Operation asks.",
      action: "Report no-show",
      danger: true,
    });
    if (yes) tap("no-show", note);
  }

  function sendProblem() {
    if (!problem?.trim()) {
      setError("Say what the problem is, then send it.");
      return;
    }
    tap("problem", problem);
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
                placeholder="The customer came at 8:15"
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
      {open ? (
        problem === null ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => void noShow()}>
              <UserX aria-hidden className="size-5" />
              No-show
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={() => {
                setError(null);
                setProblem("");
              }}
            >
              <TriangleAlertIcon className="size-5" />
              Problem
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 rounded-card border border-danger-edge bg-danger-tint p-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-danger-strong">
                What is the problem?
              </span>
              <Textarea
                value={problem}
                onChange={(event) => setProblem(event.target.value)}
                maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
                rows={3}
                autoFocus
                placeholder="Flat tyre on the way, about 30 minutes late"
              />
            </label>
            <div className="grid grid-cols-[1fr_1.4fr] gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setError(null);
                  setProblem(null);
                }}
              >
                Back
              </Button>
              <Button variant="destructive" size="lg" onClick={sendProblem}>
                Send to Operation
              </Button>
            </div>
          </div>
        )
      ) : null}
      <FormError error={error} />
      {dialog}
    </div>
  );
}
