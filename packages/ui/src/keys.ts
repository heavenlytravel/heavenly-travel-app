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
