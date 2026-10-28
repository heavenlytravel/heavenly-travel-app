import type { KeyboardEvent } from "react";

/**
 * The keys of a radio group drawn as buttons with the role "radio", as
 * native radios answer them: an arrow moves to the next or the previous
 * choice that can be taken, round the ends, takes it and focuses it; only
 * the choice taken, or the first that can be, is in the tab order. Spread
 * `onKeyDown` on the group and give each button `tabIndexOf` its index.
 */
export function radioKeys({
  count,
  chosen,
  canTake = () => true,
  choose,
}: {
  count: number;
  /** The index of the choice taken; -1 for none. */
  chosen: number;
  /** Whether the choice at an index can be taken: false for a disabled one. */
  canTake?: (index: number) => boolean;
  /** Takes the choice at an index. */
  choose: (index: number) => void;
}) {
  const indexes = Array.from({ length: count }, (_, index) => index);
  const stop =
    chosen >= 0 && canTake(chosen) ? chosen : (indexes.find(canTake) ?? -1);

  return {
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const step =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? -1
            : 0;
      if (step === 0 || count === 0) return;
      event.preventDefault();
      const from = stop >= 0 ? stop : step > 0 ? -1 : count;
      for (let moved = 1; moved <= count; moved += 1) {
        const next = (((from + step * moved) % count) + count) % count;
        if (!canTake(next)) continue;
        choose(next);
        event.currentTarget
          .querySelectorAll<HTMLElement>('[role="radio"]')
          [next]?.focus();
        return;
      }
    },
    tabIndexOf: (index: number) => (index === stop ? 0 : -1),
  };
}
