"use client";

import { checkImageFile, type UploadedImage } from "@repo/db";
import { toast } from "@repo/ui/toast";
import { createContext, useCallback, useContext, useId, useState } from "react";

const FAILED = "It could not be uploaded. Try again.";

/**
 * Tells a form that an upload started (1) or ended (-1), so its save waits
 * for the files. The form counts them with `useUploadCount` and provides
 * its `track` here; outside a form an upload tells no one.
 */
export const UploadsContext = createContext<(change: 1 | -1) => void>(() => {});

/** The uploads under way in a form: `uploading` while any is; `track` for `UploadsContext`. */
export function useUploadCount() {
  const [count, setCount] = useState(0);
  const track = useCallback(
    (change: 1 | -1) => setCount((current) => current + change),
    [],
  );
  return { uploading: count > 0, track };
}

/** One file stored at the route, or why not. */
async function store(
  uploadPath: string,
  file: File,
): Promise<UploadedImage | { error: string }> {
  const check = checkImageFile(file);
  if (!check.ok) return { error: check.error };
  try {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch(uploadPath, { method: "POST", body });
    const answer = (await response.json()) as
      UploadedImage | { error?: string };
    if (response.ok && "url" in answer) return answer;
    return { error: ("error" in answer && answer.error) || FAILED };
  } catch {
    return { error: FAILED };
  }
}

/**
 * Stores images the moment they are chosen, one after another at the
 * upload route given, handing each to `onEach` as it lands, in the order
 * chosen. One toast follows them, "Uploading 2 of 6 photos…", and says
 * how many landed. A file refused or failed is skipped and named in
 * `error`, for under the field. `pending` holds the names of the files
 * still to land, for a list to show in their places. The form's
 * `UploadsContext` hears of each batch, and the form keeps the addresses
 * once it is saved.
 */
export function useImageUpload(
  uploadPath: string,
  /** What the toasts call one image: "photo", "hero image". */
  noun: string,
) {
  const track = useContext(UploadsContext);
  const toastId = useId();
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function upload(
    files: readonly File[],
    onEach: (image: UploadedImage) => void,
  ) {
    if (files.length === 0) return;
    setError(null);
    setPending(files.map((file) => file.name));
    track(1);
    const failed: string[] = [];
    let landed = 0;
    try {
      for (const [i, file] of files.entries()) {
        toast.loading(
          files.length > 1
            ? `Uploading ${i + 1} of ${files.length} ${noun}s…`
            : `Uploading the ${noun}…`,
          { id: toastId },
        );
        const stored = await store(uploadPath, file);
        if ("error" in stored) {
          failed.push(`${file.name}: ${stored.error}`);
        } else {
          onEach(stored);
          landed += 1;
        }
        setPending((names) => names.slice(1));
      }
    } finally {
      track(-1);
      setPending([]);
    }
    if (landed > 0) {
      toast.success(
        landed > 1
          ? `${landed} ${noun}s uploaded.`
          : `The ${noun} is uploaded.`,
        { id: toastId },
      );
    } else {
      toast.dismiss(toastId);
    }
    if (failed.length > 0) setError(failed.join(" "));
  }

  return { upload, uploading: pending.length > 0, pending, error };
}
