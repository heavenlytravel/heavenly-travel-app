import { IMAGE_MAX_MB, imageSizeText, type ImageSize } from "@repo/db";
import { cx } from "@repo/ui/cx";

/**
 * Under an upload's buttons: the size the place wants an image at, its
 * shape and the files taken; once one is there, its own size, and in
 * amber what its size or shape does to it. Every image upload shows it,
 * a page's, a class's, a vehicle's, a logo, a picture in the text.
 */
export function ImageSizeHint({
  size,
  loaded,
  warning,
}: {
  size: ImageSize;
  /** The image there now, as it loaded; none while there is none. */
  loaded?: { width: number; height: number } | null;
  warning?: string | null;
}) {
  return (
    <div className="grid gap-0.5 text-xs">
      <p className="text-muted">
        {imageSizeText(size)} {size.note} JPEG, PNG or WebP, at most{" "}
        {IMAGE_MAX_MB} MB.
      </p>
      {loaded ? (
        <p
          className={cx(
            "tabular-nums",
            warning ? "text-warning" : "text-muted",
          )}
        >
          This one is {loaded.width} × {loaded.height} px
          {warning ? `. ${warning}` : "."}
        </p>
      ) : null}
    </div>
  );
}
