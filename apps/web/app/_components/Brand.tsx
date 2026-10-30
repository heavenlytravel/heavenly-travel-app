/** Small presentational pieces shared across the customer site. */

import Link from "next/link";
import { cx } from "@repo/ui/cx";
import {
  BedPlainIcon,
  CarPlainIcon,
  CoachIcon,
  KeyIcon,
  SuitcaseIcon,
  TicketIcon,
} from "@repo/ui/icons";
import { Logo } from "@repo/ui/logo";

/**
 * Plain <img> for the /brand photos. They are already sized for the web and
 * served from /public, so next/image adds nothing here; one suppression for
 * the lint rule instead of one per photo. `width` and `height` are the
 * picture's own, so the browser keeps its room before it loads; the class
 * still sizes it.
 */
export function Photo({
  src,
  alt,
  width,
  height,
  className,
  loading = "lazy",
  style,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      // The one eager photo on a page is its hero.
      fetchPriority={loading === "eager" ? "high" : undefined}
      style={style}
    />
  );
}

/**
 * The logo as the way home, as the header, the footer and the plain pages
 * show it. The link names itself, so the logo inside says nothing more.
 * `white` draws it on the footer's navy, with the ring for a dark ground;
 * `logoClassName` sets its height.
 */
export function HomeLink({
  tone = "brand",
  loading,
  className,
  logoClassName = "h-10",
}: {
  tone?: "brand" | "white";
  loading?: "lazy" | "eager";
  className?: string;
  logoClassName?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Heavenly Travel home"
      className={cx(
        "focus-ring",
        tone === "white" && "focus-ring-dark",
        className,
      )}
    >
      <Logo tone={tone} alt="" loading={loading} className={logoClassName} />
    </Link>
  );
}

const PRODUCT_ICONS = {
  rental: KeyIcon,
  package: SuitcaseIcon,
  "car-with-driver": CarPlainIcon,
  "coach-charter": CoachIcon,
  attraction: TicketIcon,
  hotel: BedPlainIcon,
};

/** The icon for a product, 20px unless `className` sizes it. */
export function ProductIcon({
  service,
  className = "size-5",
}: {
  service: keyof typeof PRODUCT_ICONS;
  className?: string;
}) {
  const Icon = PRODUCT_ICONS[service];
  return <Icon className={className} />;
}
