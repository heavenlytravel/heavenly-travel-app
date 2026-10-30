"use client";

import { formatBytes, plural } from "@repo/db";
import type { MediaPickerProps } from "@repo/console/PhotoList";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Dialog, DialogActions } from "@repo/ui/dialog";
import { inputClassName } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { CheckIcon, SearchIcon } from "@repo/ui/icons";
import { Bone } from "@repo/ui/skeleton";
import { toast } from "@repo/ui/toast";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  chooseMediaAction,
  listMediaChoicesAction,
  type MediaChoice,
} from "../_lib/media-actions";

/**
 * "Choose from Media", beside an image field's upload (BL-84): a dialog
 * over the files already stored that the admin's team works with, newest
 * first, narrowed by name, so one picture serves several places without
 * a second upload. The list is read when the dialog opens, not with the
 * page. One file is picked for an image, several, up to `most`, for a
 * vehicle's photos; the field takes them as it takes an upload. Only the
 * console has it: Connect's fields are passed none.
 */
export function MediaPicker({
  label,
  most,
  disabled,
  onPick,
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<MediaChoice[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The newest opening's list wins: one asked for before it is dropped.
  const asked = useRef(0);

  function show() {
    const ask = ++asked.current;
    setOpen(true);
    setFiles(null);
    setListError(null);
    setQuery("");
    setChosen([]);
    setError(null);
    void listMediaChoicesAction().then((answer) => {
      if (ask !== asked.current) return;
      if (answer.ok) setFiles(answer.files);
      else setListError(answer.error);
    });
  }

  function toggle(key: string) {
    setError(null);
    setChosen((was) =>
      was.includes(key)
        ? was.filter((other) => other !== key)
        : most === 1
          ? [key]
          : was.length < most
            ? [...was, key]
            : was,
    );
  }

  function use() {
    startTransition(async () => {
      const answer = await chooseMediaAction([...chosen]);
      if (!answer.ok) {
        setError(answer.error);
        return;
      }
      onPick(answer.images);
      toast.success(
        answer.images.length === 1
          ? "Image chosen from Media."
          : `${plural(answer.images.length, "image")} chosen from Media.`,
      );
      setOpen(false);
    });
  }

  const term = query.trim().toLowerCase();
  const shown = files?.filter((file) => file.name.toLowerCase().includes(term));
  const full = most > 1 && chosen.length >= most;

  return (
    <>
      <Button variant="secondary" size="sm" disabled={disabled} onClick={show}>
        Choose from Media
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title="Choose from Media"
        description={`${label}: ${
          most === 1
            ? "an image already uploaded."
            : `up to ${plural(most, "image")} already uploaded.`
        }`}
        width="lg"
      >
        <div className="grid gap-4">
          <div role="search" className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="Search the images by name"
              placeholder="Name of the file"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // Inside a form, Enter here would save it.
                if (event.key === "Enter") event.preventDefault();
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
              className={`${inputClassName} pl-9`}
            />
          </div>

          <div className="max-h-[min(28rem,50dvh)] overflow-y-auto">
            {listError ? (
              <FormError error={listError} />
            ) : !shown ? (
              <ul
                aria-label="Loading the images"
                className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3"
              >
                {Array.from({ length: 8 }, (_, tile) => (
                  <li key={tile} className="grid gap-1.5">
                    <Bone className="aspect-[3/2] w-full" />
                    <Bone className="h-3.5 w-3/4" />
                  </li>
                ))}
              </ul>
            ) : shown.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                {files && files.length > 0
                  ? "No image has that in its name."
                  : "No images uploaded yet."}
              </p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 p-0.5">
                {shown.map((file) => {
                  const on = chosen.includes(file.key);
                  return (
                    <li key={file.key} className="grid">
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={!on && full}
                        onClick={() => toggle(file.key)}
                        className={cx(
                          "grid content-start gap-1.5 rounded-control p-1.5 text-left transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50",
                          on
                            ? "bg-brand-tint ring-2 ring-brand"
                            : "enabled:hover:bg-hover",
                        )}
                      >
                        <span className="relative block aspect-[3/2] overflow-hidden rounded-md bg-canvas">
                          <Image
                            src={file.url}
                            alt=""
                            fill
                            sizes="9rem"
                            className="object-contain"
                          />
                          {on ? (
                            <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-brand text-white [&_svg]:size-3.5">
                              <CheckIcon />
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="truncate text-xs font-medium text-body"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <span className="-mt-1 text-2xs text-muted tabular-nums">
                          {formatBytes(file.size)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <FormError error={error} />
          <DialogActions>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={chosen.length === 0}
              pending={pending}
              onClick={use}
            >
              {chosen.length > 1
                ? `Use ${plural(chosen.length, "image")}`
                : "Use image"}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </>
  );
}
