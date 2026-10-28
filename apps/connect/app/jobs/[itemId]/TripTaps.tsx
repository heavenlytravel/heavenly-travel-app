"use client";

import {
  formatLocalTime,
  isTripEventKind,
  nextTripStep,
  TRIP_EVENT_LABELS,
  TRIP_EVENT_NOTE_MAX_LENGTH,
  TRIP_STEPS,
  type TripEventKind,
} from "@repo/db";
import type { TripEventView } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { toast } from "@repo/ui/toast";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FormError } from "@repo/console/FormError";
import { reportTapAction, type TapPayload } from "../../actions";

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

/**
 * The driver's report buttons, large for a thumb: the next step stands
 * out, the others stay at hand, and No-show and a problem below. A tap is
 * kept on the phone first, with an id made here, then sent; without
 * signal it waits and is sent again on the next load or when the phone is
 * back online. The server keeps a tap once, however often it is sent.
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
  const [waiting, setWaiting] = useState<TapPayload[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState(false);

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

  function tap(kind: TripEventKind) {
    if (kind === "problem" && !note.trim()) {
      setProblem(true);
      setError("Say what the problem is, then tap again.");
      return;
    }
    setError(null);
    const payload: TapPayload = {
      itemId,
      kind,
      at: new Date().toISOString(),
      note: note.trim() || null,
      clientId: crypto.randomUUID(),
    };
    writeQueue([...readQueue(), payload]);
    setWaiting((current) => [...current, payload]);
    setNote("");
    setProblem(false);
    toast.success(
      `${TRIP_EVENT_LABELS[kind]}, ${formatLocalTime(new Date(payload.at))}.`,
    );
    void flush();
  }

  const shown = [
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

  return (
    <div className="grid gap-4">
      {shown.length > 0 ? (
        <ol className="grid gap-1 text-sm">
          {shown.map((event) => (
            <li key={event.key} className="flex flex-wrap gap-x-2">
              <span className="text-slate-500 tabular-nums">
                {formatLocalTime(event.at)}
              </span>
              <span className="font-medium">
                {isTripEventKind(event.kind)
                  ? TRIP_EVENT_LABELS[event.kind]
                  : event.kind}
              </span>
              {event.note ? (
                <span className="text-slate-600">{event.note}</span>
              ) : null}
              {event.sent ? null : (
                <span className="text-amber-700">waiting for signal</span>
              )}
            </li>
          ))}
        </ol>
      ) : null}
      {open ? (
        <>
          <div className="grid gap-2">
            {TRIP_STEPS.map((step) => (
              <Button
                key={step}
                size="lg"
                variant={step === next ? "primary" : "secondary"}
                onClick={() => tap(step)}
              >
                {TRIP_EVENT_LABELS[step]}
              </Button>
            ))}
          </div>
          <Field
            label="Note"
            hint={
              problem
                ? "Say what the problem is."
                : "Optional, sent with your next tap."
            }
          >
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={TRIP_EVENT_NOTE_MAX_LENGTH}
              autoComplete="off"
              placeholder="The customer came at 8:15"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => tap("no-show")}
            >
              {TRIP_EVENT_LABELS["no-show"]}
            </Button>
            <Button size="lg" variant="caution" onClick={() => tap("problem")}>
              {TRIP_EVENT_LABELS.problem}
            </Button>
          </div>
        </>
      ) : null}
      <FormError error={error} />
    </div>
  );
}
