"use client";

import { Command } from "cmdk";
import { Popover } from "radix-ui";
import { useState } from "react";
import { cx } from "./cx.js";
import { inputClassName } from "./field.js";
import { FormValue } from "./form-value.js";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "./icons.js";
import { usePortalContainer } from "./portal-container.js";

/** The value of the "Create" row in the list, apart from any option's. */
const CREATE = "\u0000create";

/** Text as a name is kept: trimmed, one space between its words. */
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** Two values that are one typed differently: "toyota  " and "Toyota". */
const sameText = (a: string, b: string) =>
  squash(a).toLowerCase() === squash(b).toLowerCase();

const row =
  "ui:flex ui:cursor-default ui:items-center ui:gap-2 ui:rounded-sm ui:px-2 ui:py-1.5 ui:text-sm ui:outline-hidden ui:select-none ui:aria-selected:bg-accent ui:aria-selected:text-accent-foreground";

/**
 * One value from a list, or a new one, after shadcn's combobox (a Radix
 * popover around cmdk's command menu): the field opens a search over the
 * options, typing keeps the ones holding the text, and "Create" under them
 * takes the text as typed when no option is that text already, whatever
 * its case. The arrows and Enter as in a menu. Controlled with `value` and
 * `onValueChange`. With `name` it posts with its form, and `required`
 * refuses an empty value as a text field would.
 */
export function Combobox({
  name,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  maxLength,
  required,
}: {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Each once, in the order to list them. */
  options: readonly string[];
  /** What the field says while it is empty. */
  placeholder: string;
  /** What the search says while nothing is typed. */
  searchPlaceholder: string;
  /** The longest a new value may be. */
  maxLength?: number;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { ref, container, trigger } = usePortalContainer();
  const typed = squash(search);
  // A value just created is not an option yet: it is listed last, ticked.
  const listed =
    value && !options.some((option) => sameText(option, value))
      ? [...options, value]
      : options;
  const shown = listed.filter((option) =>
    option.toLowerCase().includes(typed.toLowerCase()),
  );
  const creatable =
    typed !== "" && !listed.some((option) => sameText(option, typed));

  function choose(next: string) {
    onValueChange(next);
    setOpen(false);
  }

  return (
    <>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Each opening starts a new search.
          if (next) setSearch("");
        }}
      >
        <Popover.Trigger
          ref={ref}
          // A field holding a value picked from a list: read as one, with
          // whether it must be filled.
          role="combobox"
          aria-required={required}
          className={cx(
            inputClassName,
            "ui:flex ui:items-center ui:justify-between ui:gap-2 ui:text-left",
          )}
        >
          <span
            className={cx(
              "ui:min-w-0 ui:truncate",
              !value && "ui:text-neutral-400",
            )}
          >
            {value || placeholder}
          </span>
          <ChevronDownIcon className="ui:shrink-0 ui:text-neutral-500" />
        </Popover.Trigger>
        <Popover.Portal container={container}>
          <Popover.Content
            align="start"
            sideOffset={4}
            collisionPadding={8}
            aria-label={placeholder}
            className="ui:z-50 ui:w-[var(--radix-popover-trigger-width)] ui:overflow-hidden ui:rounded-popover ui:border ui:border-popover-line ui:bg-popover ui:text-popover-foreground ui:shadow-lg ui:outline-none"
          >
            {/* The list is narrowed here, so "Create" stays last. It opens
                on the value there is. */}
            <Command
              label={searchPlaceholder}
              shouldFilter={false}
              loop
              defaultValue={listed.find((option) => sameText(option, value))}
            >
              <Command.Input
                value={search}
                onValueChange={setSearch}
                // Typing a search is not a change of the field: the field
                // around it keeps its message until a value is chosen.
                onInput={(event) => event.stopPropagation()}
                maxLength={maxLength}
                placeholder={searchPlaceholder}
                className="ui:h-10 ui:w-full ui:border-b ui:border-popover-line ui:bg-transparent ui:px-3 ui:text-sm ui:outline-none ui:placeholder:text-neutral-400"
              />
              <Command.List className="ui:max-h-[min(18rem,calc(var(--radix-popover-content-available-height)_-_2.5rem))] ui:scroll-py-1 ui:overflow-y-auto ui:p-1">
                <Command.Empty className="ui:px-2 ui:py-4 ui:text-center ui:text-sm ui:text-neutral-500">
                  None yet. Type one to add it.
                </Command.Empty>
                {shown.map((option) => (
                  <Command.Item
                    key={option}
                    value={option}
                    onSelect={() => choose(option)}
                    className={row}
                  >
                    <span className="ui:min-w-0 ui:flex-1 ui:truncate">
                      {option}
                    </span>
                    {sameText(option, value) ? (
                      <CheckIcon className="ui:shrink-0" />
                    ) : null}
                  </Command.Item>
                ))}
                {creatable ? (
                  <Command.Item
                    value={CREATE}
                    onSelect={() => choose(typed)}
                    className={row}
                  >
                    <PlusIcon className="ui:shrink-0 ui:text-neutral-500" />
                    <span className="ui:min-w-0 ui:truncate">
                      Create{" "}
                      <span className="ui:font-medium">
                        &ldquo;{typed}&rdquo;
                      </span>
                    </span>
                  </Command.Item>
                ) : null}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <FormValue
        name={name}
        value={value}
        required={required}
        control={trigger}
      />
    </>
  );
}
