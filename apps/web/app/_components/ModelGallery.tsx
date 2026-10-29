"use client";

import { photoAlt } from "@repo/db";
import { Dialog } from "@repo/ui/dialog";
import { ChevronLeftIcon, ChevronRightIcon } from "@repo/ui/icons";
import Image from "next/image";
import { useEffect, useEffectEvent, useState } from "react";

/** A model of a class as the customer sees it: its name and its photos in order. Plain data. */
export type GalleryModel = {
  id: string;
  name: string;
  photos: { url: string; caption: string }[];
};

/** Whether any of the models has a photo to show. */
function hasPhotos(models: readonly GalleryModel[]) {
  return models.some((model) => model.photos.length > 0);
}

const pill =
  "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus-ring";

/** The round buttons over the photo to the one before and after; the caller places each. */
const photoStep =
  "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand shadow-control focus-ring";

/**
 * The photos of a class's models, or of one model, in a dialog, one model
 * at a time: the models as toggle buttons when there are several, the one
 * shown pressed, the photo large with its caption, the one before and
 * after, and the photos as thumbnails. Left and Right show the one before
 * and after from anywhere in the dialog, and "2 of 5" is read out as it
 * changes. The photo takes the room the rest leaves, shown whole in its
 * frame, so the dialog fits the window without scrolling. Controlled: the
 * page owns `open`, so the options form keeps one gallery outside its
 * cards, whose clicks would otherwise choose the class. It opens at the
 * first model.
 */
export function ModelGallery({
  title,
  description,
  models,
  open,
  onOpenChange,
}: {
  /** What the photos are of: a class, "MPV VIP", or one model. */
  title: string;
  /** The line under the title. */
  description: string;
  models: readonly GalleryModel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shown = models.filter((model) => model.photos.length > 0);
  const [modelId, setModelId] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const model = shown.find((m) => m.id === modelId) ?? shown[0];
  const count = model?.photos.length ?? 0;
  const index = Math.max(0, Math.min(at, count - 1));
  const go = (step: number) => setAt((index + step + count) % count);

  // The arrows while the dialog is open: it is modal, so nothing behind
  // it wants them, and a thumbnail strip they would scroll stays put.
  const onArrow = useEffectEvent((e: KeyboardEvent) => {
    if (count < 2 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(e.key === "ArrowLeft" ? -1 : 1);
  });
  useEffect(() => {
    if (!open) return;
    const listener = (e: KeyboardEvent) => onArrow(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [open]);

  if (!model) return null;
  const photo = model.photos[index]!;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${title} photos`}
      description={description}
      width="lg"
    >
      {/* As tall as the dialog lets it be under its title: the photo
          gives up the height the rest needs. */}
      <div className="flex max-h-[calc(var(--dialog-height)-6.5rem)] min-w-0 flex-col gap-4">
        {shown.length > 1 ? (
          <div
            role="group"
            aria-label="Models"
            className="flex shrink-0 flex-wrap gap-2"
          >
            {shown.map((m) => {
              const on = m.id === model.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setModelId(m.id);
                    setAt(0);
                  }}
                  className={`${pill} ${
                    on
                      ? "border-brand bg-brand text-white"
                      : "border-card-edge bg-white text-brand hover:border-brand"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        ) : null}

        <figure className="flex min-h-0 flex-col gap-2">
          <div className="relative aspect-[3/2] min-h-0 w-full overflow-hidden rounded-xl bg-mist">
            <Image
              key={photo.url}
              src={photo.url}
              alt={photoAlt(model.name, photo)}
              fill
              sizes="(min-width: 64rem) 60rem, 94vw"
              className="object-contain"
            />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() => go(-1)}
                  className={`left-3 ${photoStep}`}
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => go(1)}
                  className={`right-3 ${photoStep}`}
                >
                  <ChevronRightIcon className="size-5" />
                </button>
              </>
            ) : null}
          </div>
          <figcaption className="flex shrink-0 flex-wrap justify-between gap-x-4 text-copy text-slate-700">
            <span>
              <strong className="text-ink">{model.name}</strong>
              {photo.caption ? `, ${photo.caption}` : null}
            </span>
            {count > 1 ? (
              <span aria-live="polite" className="text-muted tabular-nums">
                {index + 1} of {count}
              </span>
            ) : null}
          </figcaption>
        </figure>

        {count > 1 ? (
          <ol className="flex shrink-0 gap-2 overflow-x-auto pb-1">
            {model.photos.map((p, i) => (
              <li key={`${p.url}-${i}`} className="shrink-0">
                {/* Its ring drawn inside: the strip scrolls, and clips. */}
                <button
                  type="button"
                  aria-label={`Photo ${i + 1}${p.caption ? `, ${p.caption}` : ""}`}
                  aria-current={i === index}
                  onClick={() => setAt(i)}
                  className={`relative block aspect-[3/2] w-20 overflow-hidden rounded-lg border-2 bg-mist focus-ring-inset ${
                    i === index ? "border-brand" : "border-transparent"
                  }`}
                >
                  <Image
                    src={p.url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </Dialog>
  );
}

/**
 * "See photos" and the gallery it opens, for a class card that is not a
 * choice itself: a location's product page. Each opening starts again at
 * the first model's first photo.
 */
export function ModelPhotosButton({
  title,
  models,
  className = "",
}: {
  title: string;
  models: readonly GalleryModel[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Counts the openings: a new one is a new gallery.
  const [opened, setOpened] = useState(0);
  if (!hasPhotos(models)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpened((count) => count + 1);
          setOpen(true);
        }}
        className={`font-semibold text-brand underline-offset-4 hover:underline focus-ring ${className}`}
      >
        See photos
      </button>
      <ModelGallery
        key={opened}
        title={title}
        description="The models of this class we may send."
        models={models}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
