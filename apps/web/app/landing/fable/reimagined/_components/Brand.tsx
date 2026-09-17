/** Small presentational pieces shared by the four reimagined pages. */

export function Mark({
  className = "h-9 w-9",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const bg = tone === "dark" ? "#0c3b3a" : "#ffffff";
  const fg = tone === "dark" ? "#e4a93c" : "#0c3b3a";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="10" fill={bg} />
      <path
        d="M8 26c4-7 8-10 12-10s8 3 12 10"
        fill="none"
        stroke={fg}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="20" cy="15" r="3" fill={fg} />
    </svg>
  );
}

export function Wordmark({
  tone = "dark",
  className = "",
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark tone={tone} />
      <span className="font-(family-name:--font-display) text-xl font-bold leading-none tracking-tight">
        Heavenly Travel
      </span>
    </span>
  );
}

export function Stars({
  value,
  className = "h-3.5 w-3.5",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={className} aria-hidden>
          <path
            d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"
            fill={n <= Math.round(value) ? "#e4a93c" : "#d8ddd9"}
          />
        </svg>
      ))}
    </span>
  );
}

export function PersonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function BagIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

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
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading={loading} />;
}
