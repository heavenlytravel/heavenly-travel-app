/**
 * A light tap a phone can feel as a button in reach of the thumb is
 * pressed: the dock's. Android has the Vibration API. Safari on an iPhone
 * has none, but gives its own tap as a switch (`<input switch>`, iOS 18)
 * turns, so a hidden one is turned: put in the open modal dialog, if
 * there is one, since the page under it is inert. Elsewhere it does
 * nothing. Call it in the press's own handler.
 */
export function haptic() {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
    return;
  }
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.append(input);
  (document.querySelector("dialog:modal") ?? document.body).append(label);
  label.click();
  label.remove();
}
