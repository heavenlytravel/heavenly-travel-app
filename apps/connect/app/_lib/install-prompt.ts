/**
 * Run before the page hydrates (the root layout's): Chrome may offer the
 * install before React listens, so its prompt is kept on `window` for
 * `InstallApp`, and Chrome's own mini-bar is not shown.
 */
export const INSTALL_PROMPT_SCRIPT = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e;});`;
