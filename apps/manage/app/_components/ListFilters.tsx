"use client";

import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { SlidersHorizontalIcon, XIcon } from "@repo/ui/icons";
import { Picker } from "@repo/ui/picker";
import { Select } from "@repo/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { withParams } from "../_lib/routes";
import { Choices } from "./Choices";

/**
 * One choice behind a list's Filters button, kept in a field of the
 * list's address, or in the list's own state where it holds edits.
 */
export type FilterGroup = {
  /** The field of the address it fills, or the state's key: "agent". */
  param: string;
  /** Its heading in the panel, and the start of its chip: "Agent". */
  label: string;
  options: readonly { value: string; label: string }[];
  /** The value in force, one of the options'; "" for any. */
  value: string;
};

/** Up to this many options show as a segmented choice; more, as a list. */
const MAX_SEGMENTS = 3;

/** The groups with a value in force, each with its option's label. */
function activeOf(groups: readonly FilterGroup[]) {
  return groups.flatMap((group) => {
    const option = group.options.find((o) => o.value === group.value);
    return option ? [{ group, label: option.label }] : [];
  });
}

/** Every group's field taken out of the address. */
const clearedOf = (groups: readonly FilterGroup[]) =>
  Object.fromEntries(groups.map((group) => [group.param, undefined]));

/** What a choice changes: a group's field to a value, or out for any. */
type FilterChanges = Record<string, string | undefined>;

/**
 * A list's Filters button: a panel of choices beside its search, a
 * popover, or a sheet from the bottom on a phone. Each choice narrows the
 * list as it is made, from its first page, its other filters kept, and
 * the button counts those in force. `href` is the list's address as
 * filtered, without a page; a server page cannot hand the button a
 * function. `FilterChips` shows under the bar what is in force. A list
 * that keeps its filters in its own state, as one holding unsaved edits,
 * takes `FiltersButton` and `StateFilterChips` instead.
 */
export function ListFilters({
  href,
  groups,
}: {
  href: string;
  groups: readonly FilterGroup[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <FiltersButton
      groups={groups}
      pending={pending}
      onChange={(changes) =>
        startTransition(() =>
          router.replace(withParams(href, changes), { scroll: false }),
        )
      }
    />
  );
}

/** The Filters button and its panel, each choice handed to `onChange`. */
export function FiltersButton({
  groups,
  onChange,
  pending = false,
}: {
  groups: readonly FilterGroup[];
  onChange: (changes: FilterChanges) => void;
  /** The list is being narrowed: the button pulses. */
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = activeOf(groups).length;

  return (
    <Picker
      open={open}
      onOpenChange={setOpen}
      title="Filters"
      trigger={
        <Button
          variant="secondary"
          className={cx(
            "shrink-0",
            count > 0
              ? "border-brand bg-brand-tint text-brand hover:bg-white"
              : "text-body shadow-control hover:text-ink",
            pending && "animate-pulse",
          )}
        >
          <SlidersHorizontalIcon
            className={count > 0 ? "text-brand" : "text-muted"}
          />
          Filters
          {count > 0 ? <span className="tabular-nums">· {count}</span> : null}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 sm:w-72 sm:p-4">
        {groups.map((group) => (
          <div key={group.param} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">
              {group.label}
            </span>
            {group.options.length <= MAX_SEGMENTS ? (
              <Choices
                label={group.label}
                size="sm"
                value={group.value}
                options={[{ value: "", label: "Any" }, ...group.options]}
                onChange={(value) =>
                  onChange({ [group.param]: value || undefined })
                }
              />
            ) : (
              <Select
                aria-label={group.label}
                value={group.value}
                options={[{ value: "", label: "Any" }, ...group.options]}
                onValueChange={(value) =>
                  onChange({ [group.param]: value || undefined })
                }
              />
            )}
          </div>
        ))}
        {count > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => onChange(clearedOf(groups))}
          >
            Clear all
          </Button>
        ) : null}
      </div>
    </Picker>
  );
}

/** The look of a chip under a list's bar, a link or a button alike. */
const CHIP =
  "inline-flex h-7 items-center gap-1 rounded-full bg-brand-tint px-3 text-xs font-semibold text-brand transition-colors focus-ring hover:bg-hairline";
const CLEAR_ALL =
  "rounded-sm px-1 text-xs font-medium text-muted underline-offset-4 focus-ring hover:text-ink hover:underline";

/** The row the chips stand in, under a list's bar; nothing while none is. */
function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-hairline px-5 py-2.5">
      {children}
    </div>
  );
}

/**
 * The Filters in force, as chips under a list's bar, each taking its own
 * off, and "Clear all" when there are two or more. Nothing while none is.
 * `href` is the list's address as filtered, without a page.
 */
export function FilterChips({
  href,
  groups,
}: {
  href: string;
  groups: readonly FilterGroup[];
}) {
  const active = activeOf(groups);
  if (active.length === 0) return null;
  return (
    <ChipRow>
      {active.map(({ group, label }) => (
        <Link
          key={group.param}
          href={withParams(href, { [group.param]: undefined })}
          scroll={false}
          aria-label={`${group.label}: ${label}, take off`}
          className={CHIP}
        >
          {group.label}: {label}
          <XIcon className="size-3.5" />
        </Link>
      ))}
      {active.length > 1 ? (
        <Link
          href={withParams(href, clearedOf(groups))}
          scroll={false}
          className={CLEAR_ALL}
        >
          Clear all
        </Link>
      ) : null}
    </ChipRow>
  );
}

/** The same chips for a list that keeps its filters in its own state. */
export function StateFilterChips({
  groups,
  onChange,
}: {
  groups: readonly FilterGroup[];
  onChange: (changes: FilterChanges) => void;
}) {
  const active = activeOf(groups);
  if (active.length === 0) return null;
  return (
    <ChipRow>
      {active.map(({ group, label }) => (
        <button
          key={group.param}
          type="button"
          aria-label={`${group.label}: ${label}, take off`}
          className={CHIP}
          onClick={() => onChange({ [group.param]: undefined })}
        >
          {group.label}: {label}
          <XIcon className="size-3.5" />
        </button>
      ))}
      {active.length > 1 ? (
        <button
          type="button"
          className={CLEAR_ALL}
          onClick={() => onChange(clearedOf(groups))}
        >
          Clear all
        </button>
      ) : null}
    </ChipRow>
  );
}
