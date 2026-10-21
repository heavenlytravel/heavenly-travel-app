"use client";

import {
  CirclePlusIcon,
  HandIcon,
  PencilIcon,
  ScissorsIcon,
  SquarePlusIcon,
  TrashIcon,
  UndoIcon,
  XIcon,
} from "@repo/ui/icons";
import type { ReactNode } from "react";

/** Keys to press, as the screen writes them and as `aria-keyshortcuts` names them. */
export type Shortcut = { shown: string; aria: string };

/**
 * The zone maker's shortcuts, written as this computer writes them: with
 * ⌘ on a Mac, Ctrl elsewhere. Browser only.
 */
export function shortcutsHere() {
  const mac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  return {
    undo: (mac
      ? { shown: "⌘Z", aria: "Meta+Z" }
      : { shown: "Ctrl+Z", aria: "Control+Z" }) satisfies Shortcut,
    redo: (mac
      ? { shown: "⇧⌘Z", aria: "Meta+Shift+Z" }
      : {
          shown: "Ctrl+Shift+Z",
          aria: "Control+Shift+Z Control+Y",
        }) satisfies Shortcut,
    remove: { shown: "Delete", aria: "Delete Backspace" } satisfies Shortcut,
  };
}

export type Shortcuts = ReturnType<typeof shortcutsHere>;

/**
 * How the zone maker's map works, tool by tool, opened from the "i" at the
 * end of its toolbar and shown over the map's top left corner, in full
 * screen too. It stays open
 * while the admin tries what it says, until closed.
 */
export function ZoneMapHelp({
  keys,
  onClose,
}: {
  keys: Shortcuts;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="How the map works"
      className="absolute top-2.5 left-2.5 z-10 max-h-[calc(100%-6rem)] w-[25rem] max-w-[calc(100%-1.25rem)] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 text-[13px] leading-snug text-neutral-700 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-900">
          How the map works
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900"
        >
          <XIcon />
        </button>
      </div>
      <ul className="grid gap-2.5">
        <Step icon={<PencilIcon />}>
          Edit: click a piece to select it, then drag inside it to move it, or
          drag a corner.
        </Step>
        <Step icon={<HandIcon />}>
          Only move the map, so nothing changes by mistake.
        </Step>
        <Step
          icon={
            <>
              <SquarePlusIcon />
              <CirclePlusIcon />
            </>
          }
        >
          Add a square or a circle in the middle of the view.
        </Step>
        <Step
          icon={<span className="text-base leading-none font-semibold">+</span>}
        >
          Point at an edge and click the + to add a corner.
        </Step>
        <Step
          icon={
            <span className="size-2.5 rounded-[2px] border-[1.5px] border-emerald-700 bg-white" />
          }
        >
          Drag a small square on the dashed box to grow or shrink the piece.
        </Step>
        <Step icon={<ScissorsIcon />}>
          Select a corner, press the scissors, click another corner: the piece
          is cut in two.
        </Step>
        <Step icon={<TrashIcon />}>
          Remove the corner selected, or the piece ({keys.remove.shown}).
        </Step>
        <Step icon={<UndoIcon />}>
          Undo ({keys.undo.shown}), and Redo ({keys.redo.shown}) to take an undo
          back.
        </Step>
      </ul>
      <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
        Esc lets go of a cut, then the corner, then the piece. A right-click
        opens a menu of the same choices. Full screen, top right, keeps the
        hints under the map in view.
      </p>
    </div>
  );
}

function Step({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] items-start gap-2">
      <span
        aria-hidden
        className="flex h-[18px] items-center gap-0.5 text-neutral-800 [&_svg]:size-4"
      >
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
