"use client";

import { Select as Primitive } from "radix-ui";
import { useState } from "react";
import { cx } from "./cx.js";
import { inputClassName, useFieldControl } from "./field.js";
import { FormValue } from "./form-value.js";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "./icons.js";
import { usePortalContainer } from "./portal-container.js";

export type SelectOption = { value: string; label: string; disabled?: boolean };
/** Options under a heading: the districts of one state. */
export type SelectGroup = { label: string; options: SelectOption[] };

/**
 * Radix keeps "" for "nothing chosen", so a real option worth "" (such as
 * "No address") is carried as this inside the list and handed out as "".
 */
const EMPTY = "\u0000empty";
const inner = (value: string) => (value === "" ? EMPTY : value);
const outer = (value: string) => (value === EMPTY ? "" : value);

const isGroup = (entry: SelectOption | SelectGroup): entry is SelectGroup =>
  "options" in entry;

/**
 * A list to choose one from, after shadcn's select (Radix underneath): the
 * console's own list in place of the browser's, typed into to jump, with
 * the arrows and Enter. Controlled with `value` and `onValueChange`, or
 * left to itself with `defaultValue`. With `name` it posts with its form,
 * and `required` refuses an empty choice as a text field would. `bare`
 * drops the box, for a search card whose field draws its own.
 */
export function Select({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  options,
  placeholder = "Choose…",
  disabled,
  required,
  bare,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: readonly (SelectOption | SelectGroup)[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  bare?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const field = useFieldControl({ id });
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;
  const { ref, container, trigger } = usePortalContainer();

  const item = (option: SelectOption) => (
    <Primitive.Item
      key={option.value}
      value={inner(option.value)}
      disabled={option.disabled}
      className="ui:relative ui:flex ui:w-full ui:cursor-default ui:items-center ui:rounded-sm ui:py-1.5 ui:pr-8 ui:pl-2 ui:text-sm ui:outline-hidden ui:select-none ui:data-disabled:pointer-events-none ui:data-disabled:opacity-50 ui:data-highlighted:bg-accent ui:data-highlighted:text-accent-foreground"
    >
      <Primitive.ItemText>{option.label}</Primitive.ItemText>
      <span className="ui:absolute ui:right-2 ui:flex ui:size-4 ui:items-center ui:justify-center">
        <Primitive.ItemIndicator>
          <CheckIcon />
        </Primitive.ItemIndicator>
      </span>
    </Primitive.Item>
  );

  return (
    <>
      <Primitive.Root
        value={inner(current)}
        onValueChange={(next) => {
          const chosen = outer(next);
          setOwn(chosen);
          onValueChange?.(chosen);
        }}
        disabled={disabled}
      >
        <Primitive.Trigger
          ref={ref}
          {...field}
          aria-label={ariaLabel}
          className={cx(
            bare
              ? "ui:flex ui:w-full ui:items-center ui:justify-between ui:gap-2 ui:text-left ui:outline-none"
              : cx(
                  inputClassName,
                  "ui:flex ui:items-center ui:justify-between ui:gap-2 ui:text-left ui:data-placeholder:text-muted",
                ),
            className,
          )}
        >
          <span className="ui:min-w-0 ui:truncate">
            <Primitive.Value placeholder={placeholder} />
          </span>
          <Primitive.Icon asChild>
            <ChevronDownIcon className="ui:text-muted" />
          </Primitive.Icon>
        </Primitive.Trigger>
        <Primitive.Portal container={container}>
          <Primitive.Content
            position="popper"
            sideOffset={4}
            collisionPadding={8}
            className="ui:z-(--layer-popover) ui:max-h-[min(var(--radix-select-content-available-height),20rem)] ui:min-w-[var(--radix-select-trigger-width)] ui:overflow-hidden ui:rounded-popover ui:border ui:border-popover-line ui:bg-popover ui:text-popover-foreground ui:shadow-lg"
          >
            <Primitive.ScrollUpButton className="ui:flex ui:h-6 ui:items-center ui:justify-center ui:text-muted">
              <ChevronUpIcon />
            </Primitive.ScrollUpButton>
            <Primitive.Viewport className="ui:p-1">
              {options.map((entry) =>
                isGroup(entry) ? (
                  <Primitive.Group key={entry.label}>
                    <Primitive.Label className="ui:px-2 ui:pt-2 ui:pb-1 ui:text-xs ui:font-medium ui:text-muted">
                      {entry.label}
                    </Primitive.Label>
                    {entry.options.map(item)}
                  </Primitive.Group>
                ) : (
                  item(entry)
                ),
              )}
            </Primitive.Viewport>
            <Primitive.ScrollDownButton className="ui:flex ui:h-6 ui:items-center ui:justify-center ui:text-muted">
              <ChevronDownIcon />
            </Primitive.ScrollDownButton>
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
      <FormValue
        name={name}
        value={current}
        required={required}
        control={trigger}
      />
    </>
  );
}
