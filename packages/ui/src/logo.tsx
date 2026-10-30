import { cx } from "./cx.js";

/**
 * The logo, from the brand file both apps serve at `/brand/logo-blue.svg`.
 * It keeps the file's own size (120 by 28) so nothing beside it moves when
 * it loads; `className` sets its height and its width follows. `white`
 * draws the navy file white, for navy and ink surfaces.
 */
export function Logo({
  tone = "brand",
  alt = "Heavenly, your travel engineer",
  loading,
  className,
}: {
  tone?: "brand" | "white";
  /** Empty inside a link that names itself. */
  alt?: string;
  /** `eager` where it is at the top of the page, as in a header. */
  loading?: "lazy" | "eager";
  className: string;
}) {
  return (
    // A plain img: the SVG needs no resizing.
    <img
      src="/brand/logo-blue.svg"
      alt={alt}
      width={120}
      height={28}
      loading={loading}
      fetchPriority={loading === "eager" ? "high" : undefined}
      className={cx(
        "ui:w-auto",
        tone === "white" && "ui:brightness-0 ui:invert",
        className,
      )}
    />
  );
}
