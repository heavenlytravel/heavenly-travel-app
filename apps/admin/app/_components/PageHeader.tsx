import { type ReactNode } from "react";

export type HeaderProps = {
  title: string;
  /** What stands beside the title: the record's status. */
  badge?: ReactNode;
  description?: string;
  /** What stands at the right, level with the title: the buttons, a status. */
  action?: ReactNode;
};

/** The heading of a console page. */
export function PageHeader(props: HeaderProps) {
  return <Header level={1} {...props} />;
}

/**
 * The shape `PageHeader` and `SectionHeader` share: the title with its
 * badge, and the actions at the right on the same line, centred on the
 * title; under them, the line that says what the page is. On a narrow
 * screen the actions wrap under the title.
 */
export function Header({
  level,
  title,
  badge,
  description,
  action,
}: HeaderProps & { level: 1 | 2 }) {
  const Title = level === 1 ? "h1" : "h2";
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Title
            className={
              level === 1
                ? "text-2xl font-semibold tracking-tight"
                : "text-xl font-semibold tracking-tight"
            }
          >
            {title}
          </Title>
          {badge}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
          </div>
        ) : null}
      </div>
      {description ? (
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      ) : null}
    </header>
  );
}
