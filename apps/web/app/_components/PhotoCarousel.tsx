"use client";

import { photoAlt, type Photo } from "@repo/db";
import { CarIcon, ChevronLeftIcon, ChevronRightIcon } from "@repo/ui/icons";
import Image from "next/image";
import { useRef, useState } from "react";
import { focus } from "../(site)/_components/Page";

const arrow = `absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#073c36] shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${focus}`;

/**
 * Photos in a frame, swiped through one at a time: side by side, snapping
 * to each, so a finger, a trackpad or a mouse wheel pages them, with arrows
 * for a pointer and a dot for each photo. Spans throughout, so it sits in a
 * choice's label: the arrows are buttons, which page without choosing,
 * while a tap on a photo chooses. Being the label's first buttons, they are
 * what it labels unless it names its control with `htmlFor`. With no
 * photo the frame shows a car.
 */
export function PhotoCarousel({
  name,
  photos,
  sizes,
  decorative = false,
}: {
  /** What the photos show, "Toyota Alphard", for their alt text. */
  name: string;
  photos: readonly Photo[];
  /** As next/image takes it: how wide the frame is drawn. */
  sizes: string;
  /** In a label that names them already: the photos are read as nothing. */
  decorative?: boolean;
}) {
  const track = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState(0);
  const count = photos.length;

  function go(step: number) {
    const el = track.current;
    if (el) el.scrollBy({ left: step * el.clientWidth, behavior: "smooth" });
  }

  return (
    <span className="group relative block aspect-[4/3] overflow-hidden rounded-[10px] bg-[#f3f6f5]">
      {count === 0 ? (
        <span className="grid h-full place-items-center text-[#b9c4c1]">
          <CarIcon className="size-10" />
        </span>
      ) : (
        <span
          ref={track}
          onScroll={(event) => {
            const el = event.currentTarget;
            setAt(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, i) => (
            <span
              key={`${photo.url}-${i}`}
              className="relative h-full w-full shrink-0 snap-center"
            >
              <Image
                src={photo.url}
                alt={decorative ? "" : photoAlt(name, photo)}
                fill
                sizes={sizes}
                className="object-cover"
              />
            </span>
          ))}
        </span>
      )}
      {count > 1 ? (
        <>
          {at > 0 ? (
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(-1)}
              className={`${arrow} left-2`}
            >
              <ChevronLeftIcon className="size-5" />
            </button>
          ) : null}
          {at < count - 1 ? (
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(1)}
              className={`${arrow} right-2`}
            >
              <ChevronRightIcon className="size-5" />
            </button>
          ) : null}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5"
          >
            {photos.map((photo, i) => (
              <span
                key={`${photo.url}-${i}`}
                className={`size-1.5 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.4)] ${
                  i === at ? "bg-white" : "bg-white/55"
                }`}
              />
            ))}
          </span>
        </>
      ) : null}
    </span>
  );
}
