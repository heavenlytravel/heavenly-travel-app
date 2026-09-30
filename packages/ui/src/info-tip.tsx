import { cx } from "./cx.js";

/**
 * A small "i" that shows a sentence on hover or focus, for the one line of
 * help a field or a heading needs without taking space on the screen. Pure
 * CSS, no script: the text is in the page for screen readers through
 * `aria-describedby`.
 */
export function InfoTip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={cx("ui:relative ui:inline-flex ui:group", className)}>
      <button
        type="button"
        aria-label="More information"
        className="ui:inline-flex ui:size-4 ui:items-center ui:justify-center ui:rounded-full ui:border ui:border-neutral-400 ui:text-[0.6rem] ui:font-semibold ui:leading-none ui:text-neutral-500 ui:hover:border-neutral-700 ui:hover:text-neutral-800 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-neutral-900"
      >
        i
      </button>
      <span
        role="tooltip"
        className="ui:pointer-events-none ui:absolute ui:top-full ui:left-1/2 ui:z-30 ui:mt-1.5 ui:w-64 ui:-translate-x-1/2 ui:rounded-md ui:bg-neutral-900 ui:px-3 ui:py-2 ui:text-xs ui:leading-snug ui:font-normal ui:text-white ui:opacity-0 ui:shadow-lg ui:transition-opacity ui:group-hover:opacity-100 ui:group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
