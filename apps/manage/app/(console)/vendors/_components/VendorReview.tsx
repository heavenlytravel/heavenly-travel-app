"use client";

import { VENDOR_LIMITS, type VendorStatus } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { Field, Textarea } from "@repo/ui/field";
import { Switch } from "@repo/ui/switch";
import { toast } from "@repo/ui/toast";
import { useState, useTransition, type ReactNode } from "react";
import { FormError } from "@repo/console/FormError";
import { errorOf } from "@repo/console/action-state";
import { useActionForm } from "@repo/console/use-action-form";
import { moveVendorAction, setVendorOursAction } from "../actions";

/** The move a button makes from a status, and what it says once done. */
type Move = {
  move: "approve" | "refuse" | "suspend" | "reinstate";
  label: string;
  done: string;
  /** Asks for the reason in place of a yes. */
  reason?: string;
  question?: string;
  caution?: boolean;
};

function movesFrom(status: VendorStatus, name: string): Move[] {
  switch (status) {
    case "pending":
      return [
        {
          move: "approve",
          label: "Approve",
          done: `${name} is approved. Connect is open to it.`,
          question: `Approve ${name}? It can add its vehicles and drivers in Connect and be offered jobs.`,
        },
        {
          move: "refuse",
          label: "Refuse",
          done: `${name} is refused.`,
          reason: "Why it is refused. Staff only.",
          caution: true,
        },
      ];
    case "active":
      return [
        {
          move: "suspend",
          label: "Suspend",
          done: `${name} is suspended.`,
          reason:
            "Why it is suspended. Staff only. Its people see a suspended screen in Connect.",
          caution: true,
        },
      ];
    case "suspended":
      return [
        {
          move: "reinstate",
          label: "Reinstate",
          done: `${name} is active again.`,
          question: `Reinstate ${name}? Its vehicles and drivers can be assigned again.`,
        },
      ];
    case "refused":
      return [];
  }
}

/**
 * SUPER's part of a vendor's page: approve or refuse one that signed up,
 * suspend or reinstate one, with the reason kept for staff; and the
 * "Ours" switch, which no one else sees. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Vendors".
 */
export function VendorReview({
  vendorId,
  name,
  status,
  isOurs,
  suspendNote,
}: {
  vendorId: string;
  name: string;
  status: VendorStatus;
  isOurs: boolean;
  /** What suspending takes it off, said above the reason. */
  suspendNote?: ReactNode;
}) {
  const [dialog, confirm] = useConfirm();
  const [asking, setAsking] = useState<Move | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const moves = movesFrom(status, name);
  const form = useActionForm(moveVendorAction, {
    done: asking?.done,
    onDone: () => setAsking(null),
  });

  /** A move that needs a yes, not a reason. */
  async function moveNow(move: Move) {
    if (move.reason) {
      setAsking(move);
      return;
    }
    if (
      !(await confirm({
        title: move.question ?? move.label,
        action: move.label,
      }))
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("id", vendorId);
    formData.set("move", move.move);
    startTransition(async () => {
      const refused = errorOf(await answerOf(moveVendorAction(null, formData)));
      setError(refused);
      if (!refused) toast.success(move.done);
    });
  }

  return (
    <div className="grid gap-4">
      {status === "active" || isOurs ? (
        <OursSwitch vendorId={vendorId} name={name} isOurs={isOurs} />
      ) : null}
      {moves.length > 0 ? (
        <form {...form.formProps} className="grid gap-3">
          <input type="hidden" name="id" value={vendorId} />
          <input type="hidden" name="move" value={asking?.move ?? ""} />
          {asking?.reason ? (
            <>
              {asking.move === "suspend" ? suspendNote : null}
              <Field label="Reason" hint={asking.reason}>
                <Textarea
                  name="reviewNote"
                  rows={2}
                  required
                  maxLength={VENDOR_LIMITS.reviewNote}
                />
              </Field>
              <div className="flex items-center gap-2">
                <Button type="submit" variant="caution" disabled={form.pending}>
                  {asking.label}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAsking(null)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {moves.map((move) => (
                <Button
                  key={move.move}
                  type="button"
                  variant={move.caution ? "secondary" : "primary"}
                  disabled={pending}
                  onClick={() => void moveNow(move)}
                >
                  {move.label}
                </Button>
              ))}
            </div>
          )}
          <FormError error={form.error ?? error} />
        </form>
      ) : null}
      {dialog}
      {form.leaveDialog}
    </div>
  );
}

/** The "Ours" switch: no cost, accepted for by Operation, its vehicles on the website. */
function OursSwitch({
  vendorId,
  name,
  isOurs,
}: {
  vendorId: string;
  name: string;
  isOurs: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  async function flip(next: boolean) {
    const yes = await confirm(
      next
        ? {
            title: `Make ${name} ours?`,
            description:
              "Its vehicles and drivers cost nothing, Operation accepts its jobs, and its vehicles' photos and models reach the website.",
            action: "Make ours",
          }
        : {
            title: `Make ${name} not ours?`,
            description:
              "Its vehicles leave the website's class pictures and models, and its jobs are offered and paid like any other vendor's.",
            action: "Make not ours",
            danger: true,
          },
    );
    if (!yes) return;
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(setVendorOursAction(vendorId, next)),
      );
      setError(refused);
      if (!refused) {
        toast.success(next ? `${name} is ours.` : `${name} is not ours.`);
      }
    });
  }

  return (
    <div className="grid gap-1.5">
      <label className="flex items-center gap-3 text-sm">
        <Switch
          checked={isOurs}
          disabled={pending}
          onCheckedChange={(next) => void flip(next)}
          label="Ours"
        />
        <span>
          <span className="font-medium">Ours</span>
          <span className="block text-slate-500">
            No cost, accepted for by Operation, and its vehicles reach the
            website.
          </span>
        </span>
      </label>
      <FormError error={error} />
      {dialog}
    </div>
  );
}
