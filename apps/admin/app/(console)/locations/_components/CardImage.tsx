import type { PageImage } from "@repo/db";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The picture on top of a location's card or a page's card: the page's
 * hero image, cropped to fill; a quiet grey tile holding `fallback` while
 * there is none. `children` stand over the picture's corner: a badge.
 */
export function CardImage({
  image,
  fallback,
  sizes,
  children,
}: {
  image: PageImage | null;
  fallback: ReactNode;
  /** How wide the card is drawn, for the image's `sizes`. */
  sizes: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100">
      {image ? (
        <Image
          src={image.url}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-neutral-400">
          {fallback}
        </div>
      )}
      {children ? (
        <div className="absolute top-3 left-3 flex gap-1.5">{children}</div>
      ) : null}
    </div>
  );
}
