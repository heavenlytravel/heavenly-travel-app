"use client";

import { Button } from "@repo/ui/button";
import { MaximizeIcon, XIcon } from "@repo/ui/icons";
import {
  backdropClose,
  ModalBody,
  onModalClose,
  useModal,
} from "@repo/ui/modal";
import Image from "next/image";
import { useState } from "react";

/**
 * "View" in an image field: the image full screen on a dark backdrop, the
 * whole of it in view, as large as the screen lets it be and never larger
 * than it is. Escape, the cross or a press beside the image closes it, and
 * the focus goes back to the button. Built on the native `<dialog>`, as
 * the console's dialogs are, so the focus stays inside while it is open.
 * The file is shown as it is stored, not resized, to judge it at its own
 * size, and on white, as the field shows a logo with clear parts. A word
 * on a button beside the field's others, or a bare icon among a list's
 * quiet controls.
 */
export function ViewImage({
  src,
  alt,
  label,
  look = "button",
}: {
  src: string;
  alt: string;
  /** What the image is, as a screen reader hears the button and the view: "Hero image", "Photo 2". */
  label: string;
  look?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const ref = useModal(open);
  const close = () => setOpen(false);

  return (
    <>
      {look === "icon" ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`View ${label.toLowerCase()}`}
          onClick={() => setOpen(true)}
        >
          <MaximizeIcon />
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          aria-label={`View ${label.toLowerCase()}`}
          onClick={() => setOpen(true)}
        >
          View
        </Button>
      )}
      <dialog
        ref={ref}
        aria-label={label}
        onClose={onModalClose(close)}
        className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent p-0 text-white backdrop:bg-ink/90"
      >
        <ModalBody open={open} className="h-full">
          {open ? (
            // The room round the image is the backdrop: a press there closes it.
            <div
              className="flex h-full items-center justify-center p-4 sm:p-12"
              {...backdropClose(close)}
            >
              <Image
                src={src}
                alt={alt}
                width={1600}
                height={900}
                unoptimized
                className="h-auto max-h-full w-auto max-w-full rounded-md bg-white object-contain"
              />
            </div>
          ) : null}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-ink/60 text-white transition-colors hover:bg-ink focus-ring [&_svg]:size-5"
          >
            <XIcon />
          </button>
        </ModalBody>
      </dialog>
    </>
  );
}
