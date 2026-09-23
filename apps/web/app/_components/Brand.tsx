/** Small presentational pieces shared across the customer site. */

/**
 * Plain <img> for the /brand photos. They are already sized for the web and
 * served from /public, so next/image adds nothing here; one suppression for
 * the lint rule instead of one per photo.
 */
export function Photo({
  src,
  alt,
  className,
  loading = "lazy",
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      // The one eager photo on a page is its hero.
      fetchPriority={loading === "eager" ? "high" : undefined}
      style={style}
    />
  );
}

function CarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11" />
      <rect x="3" y="11" width="18" height="6" rx="2" />
      <path d="M6.5 17v1.5M17.5 17v1.5" />
    </svg>
  );
}

function CoachIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="13" rx="2.5" />
      <path d="M4 11h16M9 4v7M15 4v7M7.5 17v2M16.5 17v2" />
    </svg>
  );
}

function TicketIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z" />
      <path d="M14 6v2.5M14 11v2M14 15.5V18" />
    </svg>
  );
}

function BedIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M3 18v1.5M21 18v1.5" />
      <path d="M6.5 9V7.5A1.5 1.5 0 0 1 8 6h8a1.5 1.5 0 0 1 1.5 1.5V9" />
    </svg>
  );
}

function KeyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8.5-8.5M16 7l2.5 2.5M13.5 9.5l2 2" />
    </svg>
  );
}

function SuitcaseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16" />
    </svg>
  );
}

const PRODUCT_ICONS = {
  rental: KeyIcon,
  package: SuitcaseIcon,
  car: CarIcon,
  coach: CoachIcon,
  attraction: TicketIcon,
  hotel: BedIcon,
};

/** The icon for a product. */
export function ProductIcon({
  service,
  className,
}: {
  service: keyof typeof PRODUCT_ICONS;
  className?: string;
}) {
  const Icon = PRODUCT_ICONS[service];
  return <Icon className={className} />;
}
