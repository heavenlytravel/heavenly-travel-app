import { cx } from "@repo/ui/cx";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The picture on top of a card, cropped to fill its frame whatever its
 * shape: a location's or a page's hero image at 16:9, or a vehicle
 * class's picture at the 3:2 the website shows it in; or, in Media, a
 * stored file all in view at 3:2 on white, as a logo must be; a quiet tile holding `fallback` while there is none. `children`
 * stand over the picture's corner: a badge.
 */
export function CardImage({
  src,
  frame = "wide",
  fallback,
  sizes,
  children,
}: {
  /** The image's address; null for none. */
  src: string | null;
  /** "wide" is a hero's 16:9, "class" a vehicle class's 3:2, both cropped to fill; "file" keeps all of it. */
  frame?: "wide" | "class" | "file";
  fallback: ReactNode;
  /** How wide the card is drawn, for the image's `sizes`. */
  sizes: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden",
        frame === "wide" ? "aspect-[16/9]" : "aspect-[3/2]",
        frame === "file" ? "bg-white" : "bg-canvas",
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className={frame === "file" ? "object-contain" : "object-cover"}
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
