import Link from "next/link";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { ChevronRightIcon } from "@repo/ui/icons";
import type { ReactNode } from "react";
import { CardRow } from "@repo/console/Card";

/**
 * A row of the dashboard's lists that leads somewhere: its mark in a
 * square, a title over a grey line, and at the right what it leads to.
 * The title's link covers the row, so the whole row opens it.
 */
export function ActionRow({
  href,
  mark,
  title,
  line,
  end,
}: {
  href: string;
  mark: ReactNode;
  title: ReactNode;
  line: ReactNode;
  end: ReactNode;
}) {
  return (
    <CardRow className="relative transition-colors hover:bg-hover">
      {mark}
      <span className="min-w-0 flex-1">
        <Link
          href={href}
          className="block text-sm font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-brand"
        >
          {title}
        </Link>
        <span className="block truncate text-caption text-muted">{line}</span>
      </span>
      {end}
    </CardRow>
  );
}

const MARK_TONES = {
  red: "border-danger-edge bg-danger-tint text-danger",
  amber: "border-warning-edge bg-warning-tint text-warning",
  green: "border-success/20 bg-success-tint text-success",
  neutral: "border-hairline bg-shade text-navy",
} as const;

/** An icon in a rounded square, in the colour of what it is about. */
export function IconMark({
  tone,
  children,
}: {
  tone: keyof typeof MARK_TONES;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border",
        MARK_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** What a row does, a quiet button on a wide screen and a chevron on a phone; the row's own link does it. */
export function RowEnd({ verb }: { verb?: string }) {
  return (
    <>
      {verb ? (
        <Button asChild variant="secondary" size="sm" className="max-sm:hidden">
          <span aria-hidden="true">{verb}</span>
        </Button>
      ) : null}
      <ChevronRightIcon
        className={cx("text-muted", verb ? "sm:hidden" : undefined)}
      />
    </>
  );
}
