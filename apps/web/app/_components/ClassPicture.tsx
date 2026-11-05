"use client";

import { cx } from "@repo/ui/cx";
import {
  BusIcon,
  CarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@repo/ui/icons";
import Image from "next/image";
import { useRef, useState } from "react";

/**
 * A vehicle class's pictures in its 3:2 frame, each cropped to fill it
 * whatever its shape, the console's upload asks for that shape
 * (IMAGE_SIZES). Several are swiped through, or stepped with the arrows
 * and dots; one stands alone. With none, the frame holds a quiet tile
 * with the category's vehicle, so a list where some classes have pictures
 * still lines up. The class's name is always written beside it, so the
 * pictures are decorative.
 */
export function ClassPicture({
  pictures,
  category,
  sizes,
  className,
}: {
  /** The class's pictures on UploadThing, the cover first; empty for none. */
  pictures: readonly string[];
  /** Its category, whose vehicle the empty frame shows. */
  category: string;
  /** As next/image takes it: how wide the frame is drawn. */
  sizes: string;
  className?: string;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const several = pictures.length > 1;

  function go(to: number) {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
  }

  if (pictures.length === 0) {
    const Icon = category === "coach-charter" ? BusIcon : CarIcon;
    return (
      <span
        className={cx(
          "grid aspect-[3/2] place-items-center bg-gradient-to-br from-brand-tint to-white text-brand/40",
          className,
        )}
      >
        <Icon className="size-14" />
      </span>
    );
  }

  return (
    <span
      className={cx(
        "group/pictures relative block aspect-[3/2] overflow-hidden bg-canvas",
        className,
      )}
    >
      <span
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAt(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pictures.map((src, i) => (
          <span
            key={src}
            className="relative h-full w-full shrink-0 snap-start"
          >
            <Image
              src={src}
              alt=""
              fill
              sizes={sizes}
              // Only the cover loads at once; the rest as they are swiped to.
              loading={i === 0 ? undefined : "lazy"}
              className="object-cover"
            />
          </span>
        ))}
      </span>
      {several ? (
        <>
          <StepButton
            side="left"
            hidden={at === 0}
            onClick={() => go(at - 1)}
          />
          <StepButton
            side="right"
            hidden={at === pictures.length - 1}
            onClick={() => go(at + 1)}
          />
          <span className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {pictures.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Picture ${i + 1} of ${pictures.length}`}
                aria-current={i === at || undefined}
                onClick={() => go(i)}
                className={cx(
                  "size-2 rounded-full shadow-sm transition-colors focus-ring",
                  i === at ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </span>
        </>
      ) : null}
    </span>
  );
}

/** An arrow at a side of the frame, shown on hover or focus, gone at the end it points to. */
function StepButton({
  side,
  hidden,
  onClick,
}: {
  side: "left" | "right";
  hidden: boolean;
  onClick: () => void;
}) {
  if (hidden) return null;
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous picture" : "Next picture"}
      onClick={onClick}
      className={cx(
        "absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-card transition-opacity group-hover/pictures:opacity-100 focus-ring focus-visible:opacity-100",
        side === "left" ? "left-2.5" : "right-2.5",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
