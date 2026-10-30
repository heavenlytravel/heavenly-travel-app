import { useSyncExternalStore } from "react";

/**
 * True where a key press types: a field, a text area, a select, editable
 * text. A keyboard shortcut leaves those keys to what is being typed.
 */
export function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}

const noSubscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * A shortcut of Ctrl or Cmd and a key, as this device names it: "⌘ K" on
 * a Mac, "Ctrl K" elsewhere. "Ctrl" on the server and the first paint.
 */
export function useShortcutLabel(key: string) {
  const mac = useSyncExternalStore(noSubscribe, isMac, () => false);
  return `${mac ? "⌘" : "Ctrl"} ${key}`;
}
