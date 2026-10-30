import { cx } from "@repo/ui/cx";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The picture on top of a card: a location's or a page's hero image,
 * cropped to fill, or a vehicle class's picture, the whole vehicle in view;
 * a quiet mist tile holding `fallback` while there is none. `children`
 * stand over the picture's corner: a badge.
 */
export function CardImage({
  src,
  fit = "cover",
  fallback,
  sizes,
  children,
}: {
  /** The image's address; null for none. */
  src: string | null;
  /** "cover" crops a photo to fill; "contain" keeps all of it, for a vehicle. */
  fit?: "cover" | "contain";
  fallback: ReactNode;
  /** How wide the card is drawn, for the image's `sizes`. */
  sizes: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-canvas">
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className={cx(fit === "cover" ? "object-cover" : "object-contain")}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slot">
          {fallback}
        </div>
      )}
      {children ? (
        <div className="absolute top-3 left-3 flex gap-1.5">{children}</div>
      ) : null}
    </div>
  );
}
